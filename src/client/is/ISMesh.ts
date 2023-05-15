import * as THREE from "three";
import {ConstructRTFragmentShader, ISRaytracingVertexShader, ImplicitSurfaceShaderGenerator, coeffs, gradient } from "../shaders/ISRaytracingShader";
import { GenerateMaterialUniforms, Uniform } from "../shaders/ShaderGenerator";

export class ImplicitSurfaceMesh {
    geometry: THREE.PlaneGeometry;
    material: THREE.ShaderMaterial;

    constructor(c: coeffs, g: gradient, uniforms: Uniform[]) {
        this.geometry = new THREE.PlaneGeometry(2, 2, 1, 1)

        let shaderGenerator = new ImplicitSurfaceShaderGenerator(c, g, uniforms)

        const shader = shaderGenerator.GenerateShaders()

        const materialUniforms = GenerateMaterialUniforms(uniforms)

        materialUniforms["resolution"] = {value : new THREE.Vector2(window.innerWidth, window.innerHeight)}
        materialUniforms["forward"] = {value : new THREE.Vector3()}
        materialUniforms["up"] = {value : new THREE.Vector3()}
        materialUniforms["right"] = {value : new THREE.Vector3()}

        this.material = new THREE.ShaderMaterial({
            uniforms : materialUniforms,
            vertexShader: shader.vertex,
            fragmentShader: shader.fragment,
            wireframe: false
        })
    }

    public CreateMesh(): THREE.Mesh {
        return new THREE.Mesh(this.geometry, this.material)
    }

    public setUniform(uniform: string, value: any): void {
        this.material.uniforms[uniform] = {value: value}
    }

    public UpdateResolution(): void {
        this.material.uniforms.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight)   
    }

    // public UpdateCamera(camera: THREE.PerspectiveCamera): void {
    //     let forward = camera.getWorldDirection(new THREE.Vector3())
    //     let m = camera.matrixWorldInverse.toArray()
    //     //let up = new THREE.Vector3(m[4], m[5], m[6])
    //     let up = camera.up
    //     let right = camera.getWorldDirection(new THREE.Vector3());
    //     right.cross(up).normalize()
    //     up = new THREE.Vector3().copy(right).cross(forward).normalize()
    //     // console.log("---")
    //     // console.log({
    //     //     forward: forward,
    //     //     up: up,
    //     //     right: right
    //     // })
    //     camera.getWorldPosition
    //     this.material.uniforms.forward.value = forward;  
    //     this.material.uniforms.up.value = up;  
    //     this.material.uniforms.right.value = right;  
    // }
}