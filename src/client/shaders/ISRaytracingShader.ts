
export const ISRaytracingVertexShader: string = `
    out vec3 i_forward;
    out vec3 i_up;
    out vec3 i_right;
    out float i_near;
    out float i_far;
    out float i_fov;
    out mat4 i_projectionMatrix;

    void main()
    {   
        i_projectionMatrix = projectionMatrix;

        i_right = vec3(viewMatrix[0].x, viewMatrix[1].x, viewMatrix[2].x);
        i_up = vec3(viewMatrix[0].y, viewMatrix[1].y, viewMatrix[2].y);
        i_forward = -vec3(viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z);

        i_near = projectionMatrix[3].z / (projectionMatrix[2].z - 1.0);
        i_far = projectionMatrix[3].z / (projectionMatrix[2].z + 1.0);

        i_fov = 2.0f * atan( 1.0f / projectionMatrix[1].y ) * 180.0f;

        gl_Position = vec4(position,1.0);
    }
`

export const ISRaytracingFragmentShader: string = `
    uniform vec2 resolution;
    in vec3 i_forward;
    in vec3 i_up;
    in vec3 i_right;
    in float i_near;
    in float i_far;
    in float i_fov;
    in mat4 i_projectionMatrix;

    const float PI = 3.14159265359f;
    const float tMin = 0.5f;

    float sgn(float x) {
        return x < 0.0 ? -1.0: 1.0; // Return 1 for x == 0
      }

    void assert(bool t) {
    }

    struct Ray {
        vec3 origin;
        vec3 dir;
    };

    struct Camera {
        vec3 origin;
        vec3 dir;
        vec3 up;
        vec3 right;
        float fov;
    };

    vec3 rayAt(Ray r, float t) {
        return r.origin + t * r.dir;
    }

    bool hit_sphere(vec3 center, float radius, Ray r, out float t) {
        vec3 oc = r.origin - center;
        float a = dot(r.dir, r.dir);
        float b = 2.0f * dot(oc, r.dir);
        float c = dot(oc, oc) - radius*radius;
        float discriminant = b*b - 4.0f * a * c;
        if (discriminant < 0.0f) {
            t = -1.0f;
            return false;
        } else {
            t = (-b - sqrt(discriminant) ) / (2.0f*a);
            return true;
        }
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

    int solve_pol(float a, float b, float c, float d, float e, out vec4 roots)
    {
        // if(a == 0.0 && b == 0.0 && c == 0.0)
        // {
        //     //linear
        // }
        if(a == 0.0 && b == 0.0) //quadratic
        {
            // vec2 res;
            // int n = quadratic(c, d, e, res); // returns only x > 0.0
            // roots = vec4(min(res[0], res[1]), max(res[0], res[1]), 0.0, 0.0);
            return quadratic(c, d, e, roots.xy);
        }
        if(a == 0.0) //cubic
        {
            // int n = cubic(b, c, d, e, roots.xyz);
            // roots.w = i_far;
            // return n;
            return cubic(b, c, d, e, roots.xyz);
        }
        return quartic(a, b, c, d, e, roots);
    }

    vec4 sortVec4(vec4 roots)
    {
        if(roots.y < roots.x) roots.xy = roots.yx;
        if(roots.w < roots.z) roots.zw = roots.wz;
        return vec4(min(roots.x, roots.z), max(roots.x, roots.z),min(roots.y, roots.w), max(roots.y, roots.w));
    }

    float calculateDepth(Camera camera, Ray ray, float t)
    {
        float eyeHitZ = -t *dot(camera.dir ,ray.dir);
        float ndcDepth = ((i_far + i_near) + (2.0*i_far*i_near)/eyeHitZ) / (i_far-i_near);
        return ((gl_DepthRange.diff * ndcDepth) + gl_DepthRange.near + gl_DepthRange.far) / 2.0;
    }

    void main()
    {
        Camera camera = Camera(
            cameraPosition, //position
            i_forward, //forward / dir
            i_up, //up
            i_right, //right
            i_fov / PI // fov
            );

        float aspectRatio = resolution.x / resolution.y;

        vec3 hor = -tan(camera.fov * 2.0f) * camera.right;
        vec3 ver = length(hor) / aspectRatio * camera.up;

        vec2 uv = (gl_FragCoord.xy / resolution - vec2(0.5,0.5)) * 2.0f;

        Ray ray = Ray(
            camera.origin,
            normalize(camera.dir + uv.x * hor + uv.y * ver)
            );
        
        vec3 o = ray.origin;
        vec3 d = ray.dir;

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

        float dd = dot(d, d);
        float oo = dot(o, o);
        float od = dot(d, o);
        float d3o = dot(d, d) * dot(d, o);
        float do3 = dot(d, o) * dot(o, o);
        float RR = 0.7f * 0.7f;
        float rr = 0.4f * 0.4f;

        // float coeff[5] = float[5](
        //     dd * dd,
        //     4.0f * d3o,
        //     2.0f * (3.0f * dd * oo - dd * RR - rr * dd - 2.0f * RR * (d.x * d.x + d.y * d.y)),
        //     4.0f * (do3 + od * RR - od * rr - 2.0f * RR * (d.x * o.x + d.y * o.y)),
        //     oo * oo + 2.0f * (oo * RR - oo * rr - 2.0f * RR * (o.x * o.x + o.y * o.y)) + RR * RR - 4.0f * RR * rr + rr * rr
        // );
        
        float coeff[5] = float[5](
            dd * dd,
            4.0f * d3o,
            2.0f * dd * (oo - (rr +RR)) + 4.0f * (od * od) + 4.0f * RR * (d.y*d.y),
            4.0f * (oo - (rr + RR)) * od + 8.0f*RR*(o.y*d.y),
            (oo - (rr + RR)) * (oo - (rr + RR)) - 4.0f*RR*(rr - o.y*o.y)
        );

        bool drawn = false;

        vec4 res;
        int n;
        n = solve_pol(coeff[0], coeff[1], coeff[2], coeff[3] ,coeff[4], res);
        if (n != 0) 
        {
            vec4 sr = sortVec4(res);
            for(int i = 0; i < n; i++)
            {
                if(sr[i] > tMin && sr[i] < i_far && sr[i] > 0.0)
                {
                    #if 1
                    if(length(rayAt(ray, sr[i])) > 5.0f)
                        continue;
                    #endif
                    
                    vec3 coord = o + d * sr[i];
                    float x = coord.x;
                    float y = coord.y;
                    float z = coord.z;

                    vec3 normal = vec3(
                        x * (4.0 * (x*x + y*y + z*z) - 4.0 * (RR + rr)),
                        y * (4.0* (x*x + y*y + z*z) + 8.0 * RR - 4.0 * (RR + rr)),
                        z * (4.0 * (x*x + y*y + z*z) - 4.0 * (RR + rr))
                    );

                    drawn = true;
                    vec3 color = normalize(vec3(normal.x + 1.0, normal.y + 1.0, normal.z + 1.0)) / 2.0;
                    gl_FragColor = vec4(color, 1.0);   
                    gl_FragDepth = calculateDepth(camera, ray, sr[i]); 
                    break;
                }
            }
        }
        if(!drawn)
            discard;

    } 
`