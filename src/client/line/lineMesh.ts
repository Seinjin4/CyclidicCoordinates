import * as THREE from "three";
import { Vector3 } from "three";
import { LineMeshShaderGenerator, lineMeshPointArraySize } from "../shaders/lineMeshShader";
import { GenerateMaterialUniforms } from "../shaders/ShaderGenerator";

export class TubeMesh {
    geometry: THREE.PlaneGeometry
    material: THREE.ShaderMaterial
    shaderGenerator: LineMeshShaderGenerator

    constructor(wSegments: number, lSegments: number, closed: boolean) {
        this.geometry = new THREE.PlaneGeometry(1, 1, lSegments - 1, wSegments - 1)

        this.AddAdditionalIndices(wSegments - 1, lSegments - 1, closed)

        this.shaderGenerator = new LineMeshShaderGenerator()
        const shaders = this.shaderGenerator.GenerateShaders()
        console.log(shaders)

        const materialUniforms = GenerateMaterialUniforms(this.shaderGenerator.uniforms)

        materialUniforms["points"] = {value : []}
        materialUniforms["pointCount"] = {value : 0}
        materialUniforms["wSegments"] = {value : wSegments}

        this.material = new THREE.ShaderMaterial({
            uniforms : materialUniforms,
            vertexShader: shaders.vertex,
            fragmentShader: shaders.fragment,
            side: THREE.FrontSide ,
            wireframe: false
        })
    }
    
    public setUniform(uniform: string, value: any): void {
        this.material.uniforms[uniform] = {value: value}
    }

    public RegenerateShader()
    {

    }

    public SetPoints(points: Array<THREE.Vector3>): void {
        this.material.uniforms.pointCount.value = points.length

        for(let i = points.length; i < lineMeshPointArraySize; i++)
        {
            points.push(new THREE.Vector3(0,0,0))
        }
    
        this.material.uniforms.points.value = points
    }

    public CreateMesh(): THREE.Mesh {
        return new THREE.Mesh(this.geometry, this.material)
    }

    private AddAdditionalIndices(wSegments: number, lSegments: number, closed: boolean): void {
        const indexArrayLike = this.geometry.getIndex()?.array

        if(indexArrayLike === undefined)
            return
        
        let indexArray = Array.from(indexArrayLike)
        const lastRowStart = (lSegments + 1) * wSegments

        // connect seam along the tube
        for(let i = 0; i < lSegments; i++)
        {

            let a = lastRowStart + i                                // a - c
            let b = i                                               // | /
            let c = lastRowStart + i + 1                            // b 

            indexArray.push(a);
            indexArray.push(b);
            indexArray.push(c);

            a = i                                                  //     c
            b = i + 1                                              //   / |
            c = lastRowStart + i + 1                               // a - b

            indexArray.push(a);
            indexArray.push(b);
            indexArray.push(c);
        }

        if(closed)
        {
            for(let i = 0; i < wSegments + 1; i++)
            {
            let a = (lSegments + 1) * (i + 1) - 1                  // a - c
            let b = (lSegments + 1) * (i + 2) - 1                  // | /
            let c = (lSegments + 1) * i                            // b                 

            indexArray.push(a);
            indexArray.push(b);
            indexArray.push(c);

            a = (lSegments + 1) * (i + 2) - 1                     //     c
            b = (lSegments + 1) * (i + 1)                         //   / |
            c = (lSegments + 1) * i                               // a - b

            indexArray.push(a);
            indexArray.push(b);
            indexArray.push(c);
            }
            
            indexArray.push((lSegments + 1) * (wSegments + 1) - 1);
            indexArray.push(lSegments);
            indexArray.push((lSegments + 1) * wSegments);

            indexArray.push(lSegments);
            indexArray.push(0);
            indexArray.push((lSegments + 1) * wSegments);
        }

        this.geometry.setIndex(indexArray)
    }
}