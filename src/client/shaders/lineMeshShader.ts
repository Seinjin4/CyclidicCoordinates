import * as THREE from "three"
import { GLSLType, PrepareUniforms, ShaderGenerator, Shaders, Uniform } from "./ShaderGenerator"

export const lineMeshPointArraySize: number = 1024

export class LineMeshShaderGenerator implements ShaderGenerator {
    calculateColorFunction: string
    uniforms: Uniform[]

    constructor(calculateColorFunction?: string, uniforms?: Uniform[]) {
        if(calculateColorFunction !== undefined)
            this.calculateColorFunction = calculateColorFunction
        else
            this.calculateColorFunction = DefaultCalculateColorFunction()

        if(uniforms !== undefined)
            this.uniforms = uniforms
        else
            this.uniforms = DefaultUniforms()
    }

    GenerateShaders(): Shaders {
        const uniformString = PrepareUniforms(this.uniforms)

        const vertex = `
        uniform vec3 points[${lineMeshPointArraySize}];
        uniform uint pointCount;
        ${uniformString}
        uniform uint wSegments;
    
        out vec4 vertexColor;
        out vec3 i_normal;
    
        #define M_PI 3.141592
    
        float getFract(float t)
        {
            return fract(t * float(pointCount - 1u));
        }
    
        uint getPointIndexFloor(float t)
        {
            return uint(floor(t * float(pointCount - 1u)));
        }
    
        uint getPointIndexCeil(float t)
        {
            return uint(ceil(t * float(pointCount - 1u)));
        }
    
        vec3 getDir(uint i)
        {
            vec3 corePoint = points[i];
            if(i == 0u)
                return normalize(points[i + 1u] - corePoint);
            else if(i == pointCount - 1u)
                return normalize(-(points[i - 1u] - corePoint));
    
            return normalize((points[i + 1u] - corePoint) - (points[i - 1u] - corePoint));
        }
    
        mat4 rotationMatrix(vec3 axis, float angle)
        {
            axis = normalize(axis);
            float s = sin(angle);
            float c = cos(angle);
            float oc = 1.0 - c;
            
            return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                        0.0,                                0.0,                                0.0,                                1.0);
        }
    
        void main()
        {
            float t = uv.x;
            float a = uv.y;
            uint p0i = getPointIndexFloor(t);
            uint p1i = getPointIndexCeil(t);
    
            vec3 pos0 = points[p0i];
            vec3 pos1 = points[p1i];
            float f = getFract(t);
    
            vec3 pos = mix(pos0, pos1, f);
            vec3 dir = mix(getDir(p0i), getDir(p1i), f);
            vec3 tangent = normalize(cross(vec3(0.3, 0.3, 0.3), dir)); 
            a = a * (float(wSegments - 1u) / float(wSegments));
            i_normal = normalize((rotationMatrix(dir, M_PI*2.0*a) * vec4(tangent, 1.0f)).xyz);
            vec3 newPos = i_normal * radius + pos;
    
            gl_Position = projectionMatrix *
                            modelViewMatrix *
                            vec4(newPos,1.0);
            vertexColor = vec4(1.0, 0, 0.0, 1.0);
        }`

        const fragment = `
        in vec4 vertexColor;
        in vec3 i_normal;
        ${uniformString}

        ${this.calculateColorFunction}
    
        void main()
        {
            gl_FragColor = calculateColor(i_normal);
        } `

        return {vertex: vertex, fragment: fragment}
    }

}

function DefaultCalculateColorFunction() {
    return `vec4 calculateColor(vec3 n)
    {
        vec3 ambient = ambientStrength * lightColor;
        vec3 nlightDir = normalize(lightDir);  
        float diff = max(dot(n, nlightDir), 0.0);
        vec3 diffuse = diff * lightColor;
        vec3 result = (ambient + diffuse) * objectColor;
        return vec4(result, 1.0);
    }`
}

function DefaultUniforms(): Uniform[] {
    return [
        {type: GLSLType.vec3, name: 'lightColor', defaultValue: {value: new THREE.Vector3(0.6,0.6,0.6)}},
        {type: GLSLType.vec3, name: 'objectColor', defaultValue: {value: new THREE.Vector3(0.7,0.3,0.3)}},
        {type: GLSLType.float, name: 'ambientStrength', defaultValue: {value: 1.0}},
        {type: GLSLType.vec3, name: 'lightDir', defaultValue: {value: new THREE.Vector3(0.5,0.7,0.5)}},
        {type: GLSLType.float, name: 'radius', defaultValue: {value: 0.2}}
    ]
}