import { forEach } from "mathjs"

type Shaders = {
    vertex: string,
    fragment: string
}

enum GLSLType {
    bool = "bool",
    int = "int",
    uint = "uint",
    float = "float",
    bvec2 = "bvec2",
    bvec3 = "bvec3",
    bvec4 = "bvec4",
    ivec2 = "ivec2",
    ivec3 = "ivec3",
    ivec4 = "ivec4",
    uvec2 = "uvec2",
    uvec3 = "uvec3",
    uvec4 = "uvec4",
    vec2 = "vec2",
    vec3 = "vec3",
    vec4 = "vec4",
}

interface Uniform {
    type: GLSLType,
    name: string,
    defaultValue: THREE.IUniform<any>;
}

type MaterialUniform = {
    [uniform: string]: THREE.IUniform<any>;
}

interface ShaderGenerator {
    calculateColorFunction: string
    uniforms: Uniform[]

    GenerateShaders(): Shaders
}

function PrepareUniforms(uniforms: Uniform[]): string {
    let result = ''
    uniforms.forEach(u => {
        result += `\t\tuniform ${u.type} ${u.name};\n`
    })
    return result
}

function GenerateMaterialUniforms(uniform: Uniform[]): MaterialUniform {
    let result: MaterialUniform = {}

    uniform.forEach(x => {
        result[x.name] = x.defaultValue
    })
    return result
}

export {Shaders, GLSLType, Uniform, ShaderGenerator, PrepareUniforms, GenerateMaterialUniforms}