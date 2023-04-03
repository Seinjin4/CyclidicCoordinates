import * as THREE from "three";
import { Vector3 } from "three";
import { lineMeshFragmentShader, lineMeshPointArraySize, lineMeshVertexShader } from "../shaders/lineMeshShader";

class LineMeshData {
    geometry: THREE.PlaneGeometry;
    material: THREE.ShaderMaterial;

    constructor(wSegments: number, hSegments: number) {
        this.geometry = new THREE.PlaneGeometry(1, 1, wSegments, hSegments)

        this.material = new THREE.ShaderMaterial({
            uniforms : {
                points : {value : []},
                pointCount : {value : 0}
            },
            vertexShader: lineMeshVertexShader,
            fragmentShader: lineMeshFragmentShader,
            shadowSide: THREE.DoubleSide,
            wireframe: true
        })
    }
}

let lineMeshData: LineMeshData = new LineMeshData(50, 50)


export function CalculateLineMesh(points: Array<THREE.Vector3>): THREE.Mesh {
    lineMeshData.material.uniforms.pointCount.value = points.length

    console.log(lineMeshData.geometry.getIndex());

    if(points.length < lineMeshPointArraySize) {
        let arrayFilling: Array<THREE.Vector3> = new Array<THREE.Vector3>(lineMeshPointArraySize - points.length, )
        arrayFilling.fill(new THREE.Vector3(), 0, -1)
        points = points.concat(arrayFilling)
    }

    lineMeshData.material.uniforms.points.value = points
    return new THREE.Mesh(lineMeshData.geometry, lineMeshData.material);
}

export function createLine(color: THREE.Color, dir: THREE.Vector3): THREE.Line {
    const material = new THREE.LineBasicMaterial({
        color: color
    })
    
    const points = [];
    points.push( new THREE.Vector3( 0, 0, 0 ) );
    points.push( dir);
    
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    
    const line = new THREE.Line( geometry, material );
    return line
}