import * as THREE from "three";
import { ISRaytracingFragmentShader, ISRaytracingVertexShader } from "../shaders/ISRaytracingShader";

class ImplicitSurfaceMesh {
    geometry: THREE.PlaneGeometry;
    material: THREE.ShaderMaterial;

    constructor() {
        this.geometry = new THREE.PlaneGeometry(2, 2, 1, 1)

        this.material = new THREE.ShaderMaterial({
            uniforms : {
                resolution: {value: new THREE.Vector2(window.innerWidth, window.innerHeight)},
                forward: {value : new THREE.Vector3()},
                up: {value : new THREE.Vector3()},
                right: {value : new THREE.Vector3()}
            },
            vertexShader: ISRaytracingVertexShader,
            fragmentShader: ISRaytracingFragmentShader,
            wireframe: false
        })
    }
}

let implicitSurfaceData = new ImplicitSurfaceMesh();

export function UpdateISMeshResolutionUniform(): void {
    implicitSurfaceData.material.uniforms.resolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight)   
}

export function UpdateIsMeshCamera(camera: THREE.PerspectiveCamera)
{
    let forward = camera.getWorldDirection(new THREE.Vector3())
    let m = camera.matrixWorldInverse.toArray()
    //let up = new THREE.Vector3(m[4], m[5], m[6])
    let up = camera.up
    let right = camera.getWorldDirection(new THREE.Vector3());
    right.cross(up).normalize()
    up = new THREE.Vector3().copy(right).cross(forward).normalize()
    // console.log("---")
    // console.log({
    //     forward: forward,
    //     up: up,
    //     right: right
    // })
    camera.getWorldPosition
    implicitSurfaceData.material.uniforms.forward.value = forward;  
    implicitSurfaceData.material.uniforms.up.value = up;  
    implicitSurfaceData.material.uniforms.right.value = right;  
}

export function CalculateISMesh(): THREE.Mesh {
    return new THREE.Mesh(implicitSurfaceData.geometry, implicitSurfaceData.material);
}

export function hit_sphere(
    center: THREE.Vector3,
    radius: number,
    rayOrigin: THREE.Vector3,
    rayDir: THREE.Vector3): boolean 
    {
    let oc = rayOrigin.sub(center);
    let a = rayDir.dot(rayDir);
    let b = 2.0 * oc.dot(rayDir);
    let c = oc.dot(oc) - radius*radius;
    let discriminant = b*b - 4.0 * a * c;

    if (discriminant < 0.0)
        return false;
    return true;
}