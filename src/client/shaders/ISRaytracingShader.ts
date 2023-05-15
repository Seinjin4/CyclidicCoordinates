import { GetEqData } from "../math"
import { PrepareUniforms, ShaderGenerator, Shaders, Uniform } from "./ShaderGenerator"

export const ISRaytracingVertexShader: string = `
    uniform vec2 resolution;
    out vec3 i_forward;
    out float i_near;
    out float i_far;
    out vec3 i_dir;
    out vec3 i_eye;

    const float PI = 3.14159265359f;

    void main()
    {   
        i_forward = -vec3(viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z);

        i_near = projectionMatrix[3].z / (projectionMatrix[2].z - 1.0);
        i_far = projectionMatrix[3].z / (projectionMatrix[2].z + 1.0); PI;

        float aspect = (resolution.x / resolution.y);
        float fov_y_scale =  1.0 / (projectionMatrix[0].x * aspect);

        i_eye = -(modelViewMatrix[3].xyz)*mat3(modelViewMatrix);
        i_dir = vec3(position.x*fov_y_scale*aspect,position.y*fov_y_scale,-1.0) * mat3(modelViewMatrix);

        gl_Position = vec4(position,1.0);
    }
`

export type coeffs = {
    t0: string,
    t1: string,
    t2: string,
    t3: string,
    t4: string,
}

export type gradient = {
    x: string,
    y: string,
    z: string
}


//coeff[0]t^4 + coeff[0]t^3 + coeff[0]t^2 + coeff[0]t + coeff[0] = 0

// float coeff[5] = float[5](
//     0.0f,
//     0.0f,
//     dot(ray.dir, ray.dir),
//     2.0f * dot(ray.origin, ray.dir),
//     dot(ray.origin, ray.origin) - 0.5f*0.5f
// );

// float coeff[5] = float[5](
//     0.0f,
//     0.0f,
//     d.x * d.x + d.y * d.y + d.z * d.z,
//     2.0f * (d.x * o.x + d.y * o.y + d.z * o.z),
//     o.x * o.x + o.y * o.y + o.z * o.z - 1.0f*1.0f
// );

// float coeff[5] = float[5](
//     0.0f,
//     (d.z * d.z * d.z),
//     (d.x * d.x) + (d.y * d.y) + (3.0f * o.z * d.z * d.z) - (d.z * d.z),
//     2.0f * ((d.x * o.x) + (d.y * o.y) - (d.z * o.z)) + (3.0f * o.z * o.z * d.z),
//     (o.x * o.x) + (o.y * o.y) - (o.z * o.z) + (o.z * o.z * o.z)
// );

// float coeff[5] = float[5](
//     dd * dd,
//     4.0f * d3o,
//     2.0f * (3.0f * dd * oo - dd * RR - rr * dd - 2.0f * RR * (d.x * d.x + d.y * d.y)),
//     4.0f * (do3 + od * RR - od * rr - 2.0f * RR * (d.x * o.x + d.y * o.y)),
//     oo * oo + 2.0f * (oo * RR - oo * rr - 2.0f * RR * (o.x * o.x + o.y * o.y)) + RR * RR - 4.0f * RR * rr + rr * rr
// );

// float coeff[5] = float[5](
//     dd * dd,
//     4.0f * d3o,
//     2.0f * dd * (oo - (rr +RR)) + 4.0f * (od * od) + 4.0f * RR * (d.y*d.y),
//     4.0f * (oo - (rr + RR)) * od + 8.0f*RR*(o.y*d.y),
//     (oo - (rr + RR)) * (oo - (rr + RR)) - 4.0f*RR*(rr - o.y*o.y)
// );

export function ConstructRTFragmentShader(c: coeffs, g: gradient, u: Uniform[]): string {
    return `
    uniform vec2 resolution;
    ${PrepareUniforms(u)}
    in vec3 i_forward;
    in float i_near;
    in float i_far;
    in vec3 i_dir;
    in vec3 i_eye;

    const float PI = 3.14159265359f;
    const float tMin = 0.2f;

    struct Result {
        vec3 p;
        vec3 n;
        float t;
        vec3 color;
    };

    vec3 objectColor;

    float sgn(float x) {
        return x < 0.0 ? -1.0: 1.0;
      }

    void assert(bool t) {
    }

    vec3 rayAt(vec3 o, vec3 d, float t) {
        return o + t * d;
    }

    float evalquadratic(float x, float A, float B, float C) {
        return (A*x+B)*x+C;
      }
      
    float evalcubic(float x, float A, float B, float C, float D) {
    return ((A*x+B)*x+C)*x+D;
    }

    int quadratic(float A, float B, float C, out vec2 res) 
    {
        float b = -0.5*B, b2 = b*b;
        float q = b2 - A*C;
        if (q < 0.0) return 0;
        float r = b + sgn(b)*sqrt(q);
        if (r == 0.0) {
          res[0] = C/A;
          res[1] = -res[0];
        } else {
          res[0] = C/r;
          res[1] = r/A;
        }
        return 2;
      }

    int cubic(float a, float b, float c, float d, out vec3 res) 
    {
        if (a == 0.0) {
            return quadratic(b,c,d,res.xy);
        }
        if (d == 0.0) {
            res.x = 0.0;
            return 1+quadratic(a,b,c,res.yz);
        }
        float tmp = a; a = b/tmp; b = c/tmp; c = d/tmp;  // TODO: if(very large roots) {solve for the reciprocal roots}
        // solve x^3 + ax^2 + bx + c = 0
        float Q = (a*a-3.0*b)/9.0;
        float R = (2.0*a*a*a - 9.0*a*b + 27.0*c)/54.0;
        float R2 = R*R, Q3 = Q*Q*Q;
        if (R2 < Q3) {
            float X = clamp(R/sqrt(Q3),-1.0,1.0);
            float theta = acos(X);
            float S = sqrt(Q); // Q must be positive since 0 <= R2 < Q3
            res[0] = -2.0*S*cos(theta/3.0)-a/3.0;
            res[1] = -2.0*S*cos((theta+2.0*PI)/3.0)-a/3.0;
            res[2] = -2.0*S*cos((theta+4.0*PI)/3.0)-a/3.0;
            return 3;
        } else {
            float alpha = -sgn(R)*pow(abs(R)+sqrt(R2-Q3),0.3333);
            float beta = alpha == 0.0 ? 0.0 : Q/alpha;
            res[0] = alpha + beta - a/3.0;
            return 1;
        }
    }

    float qcubic(float B, float C, float D) 
    {
        vec3 roots;
        int nroots = cubic(1.0,B,C,D,roots);
        // Sort into descending order
        if (nroots > 1 && roots.x < roots.y) roots.xy = roots.yx;
        if (nroots > 2) {
          if (roots.y < roots.z) roots.yz = roots.zy;
          if (roots.x < roots.y) roots.xy = roots.yx;
        }
        // And select the largest
        float psi = roots[0];
        // There _should_ be a positive root, but sometimes the cubic
        // solver doesn't find it directly (probably a double root
        // around zero).
        if (psi < 0.0) assert(evalcubic(psi,1.0,B,C,D) < 0.0);
        // If so, nudge in the right direction
        psi = max(1e-6,psi);
        // and give a quick polish with Newton-Raphson
        for (int i = 0; i < 3; i++) {
          float delta = evalcubic(psi,1.0,B,C,D)/evalquadratic(psi,3.0,2.0*B,C);
          psi -= delta;
        }
        return psi;
    }

    // The Lanczos quartic method
    int lquartic(float c1, float c2, float c3, float c4, out vec4 res) 
    {
        float alpha = 0.5*c1;
        float A = c2-alpha*alpha;
        float B = c3-alpha*A;
        float a,b,beta,psi;
        psi = qcubic(2.0*A-alpha*alpha, A*A+2.0*B*alpha-4.0*c4, -B*B);
        psi = max(0.0,psi);
        a = sqrt(psi);
        beta = 0.5*(A + psi);
        if (psi <= 0.0) {
            b = sqrt(max(beta*beta-c4,0.0));
        } else {
            b = 0.5*a*(alpha-B/psi);
        }
        int resn = quadratic(1.0,alpha+a,beta+b,res.xy);
        vec2 tmp;
        if (quadratic(1.0,alpha-a,beta-b,tmp) != 0) { 
            res.zw = res.xy;
            res.xy = tmp;
            resn += 2;
        }
        return resn;
    }

    int quartic(float A, float B, float C, float D, float E, out vec4 roots) 
    {
        int nroots;
        // Solve for the smallest cubic term, this seems to give the least wild behaviour.
        if (abs(B/A) < abs(D/E)) {
          nroots = lquartic(B/A,C/A,D/A,E/A,roots);
        } else {
          nroots = lquartic(D/E,C/E,B/E,A/E,roots);
          for (int i = 0; i < nroots; i++) {
            roots[i] = 1.0/roots[i];
          }
        }
        assert(nroots == 0 || nroots == 2 || nroots == 4);
        return nroots;
    }      

    float calculateDepth(vec3 o, vec3 d, float t)
    {
        float eyeHitZ = -t *dot(i_forward, d);
        float ndcDepth = ((i_far + i_near) + (2.0*i_far*i_near)/eyeHitZ) / (i_far-i_near);
        return ((gl_DepthRange.diff * ndcDepth) + gl_DepthRange.near + gl_DepthRange.far) / 2.0;
    }

    vec4 calculateColor(vec3 p, vec3 d, vec3 n)
    {
        vec3 lightColor = vec3(0.6, 0.6, 0.6);
        //objectColor = outsideColor;
        float ambientStrength = 0.5;
        vec3 ambient = ambientStrength * lightColor;
        vec3 lightDir = normalize(-vec3(0.5, 0.7, 0.5));  
        float diff = dot(n, lightDir);
        if(diff < 0.0) diff = -diff;
        float dirdiff = dot(n, d);
        if(dirdiff < 0.0)
        {
            objectColor = insideColor;
        }
        else
            objectColor = outsideColor;
            
        vec3 diffuse = diff * lightColor;
        vec3 result = (ambient + diffuse) * objectColor;
        return vec4(result, 1.0);
    }

    vec3 calculate_normal(vec3 p)
    {
        float x = p.x;
        float y = p.y;
        float z = p.z;
        return -vec3(
            ${g.x},
            ${g.y},
            ${g.z}
        );
    }

    int solve(float a, float b, float c, float d, float e, out vec4 roots)
    {
        int nroots;
        if(a == 0.0 && b == 0.0 && c == 0.0)
        {
            nroots = 1;
            roots.x = -e / d;
            
            roots.yzw = vec3(1e8, 1e8, 1e8);
        }
        if(a == 0.0 && b == 0.0) //quadratic
        {
            nroots =  quadratic(c, d, e, roots.xy);
            roots.zw = vec2(1e8, 1e8);
        }
        if(a == 0.0) //cubic
        {
            nroots = cubic(b, c, d, e, roots.xyz);
            roots.w = 1e8;
        }
        else
        {
            nroots = quartic(a, b, c, d, e, roots);
            if(nroots == 2)
                roots.zw = vec2(1e8, 1e8);
            else if(nroots == 0)
                roots = vec4(1e8, 1e8, 1e8, 1e8);
        }
        return nroots;
    }

    bool isInBounds(vec3 p)
    {
        //return p.y < Ut && p.y > 0.0 && p.x > 0.0 && p.z < 0.0 && length(p.xz) < 2.0;
        return length(p.xz) < 10.0 && p.y > 0.0 && p.y < 10.0 && p.z > 0.0;
        // return p.y < Ut && p.y > 0.0;
        return true;
    }

    bool calculate_intersection(vec3 o, vec3 d, float tmin, out Result result)
    {
        float coeff[5] = float[5](
            ${c.t4},
            ${c.t3},
            ${c.t2},
            ${c.t1},
            ${c.t0}
        );

        vec4 roots;
        int nroots = solve(coeff[0], coeff[1], coeff[2], coeff[3] ,coeff[4], roots);

        // Find smallest root greater than tmin.
        float t = result.t;
        for (int i = 0; i < 4; i++) {
          if (i == nroots) break;
          if (roots[i] > tmin && roots[i] < t) {
            vec3 p = o + roots[i] * d;
            if(isInBounds(p))
                t = roots[i];
          }
        }
        if (t == result.t) return false;
        vec3 p = o + t*d;
        vec3 n = calculate_normal(p);

        n = normalize(n);

        result.p = p; result.n = n; result.t = t;  result.color = calculateColor(p, d, n).xyz;
        return true;
    }

    void scene(vec3 o, vec3 d) {
        vec3 color = vec3(0);
        vec3 p = o;
        float t = 0.0;

        // if (dot(p,p) > 1000.0) break;
        
        float tmin = -dot(p,d);
        //p += tmin*d;
        Result res = Result(vec3(0), vec3(0), 1e7, vec3(0));
        if (!calculate_intersection(p, d, -tmin, res)) discard;

        gl_FragColor = vec4(res.color, 1.0);
        gl_FragDepth = calculateDepth(p, d, res.t); 
      }

    void main()
    {
        vec3 o = i_eye;
        vec3 d = normalize(i_dir);

        scene(o, d);
    } 
`
}

export class ImplicitSurfaceShaderGenerator implements ShaderGenerator {
    calculateColorFunction: string
    uniforms: Uniform[]
    c: coeffs
    g: gradient

    constructor(c: coeffs, g: gradient, uniforms: Uniform[]) {
        this.c = c
        this.g = g

        this.calculateColorFunction = '' // for now
        
        this.uniforms = uniforms
    }

    GenerateShaders(): Shaders {
        const vertex = ISRaytracingVertexShader
        const fragment = ConstructRTFragmentShader(this.c, this.g, this.uniforms)
        return {vertex: vertex, fragment: fragment}
    }
}