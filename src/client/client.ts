import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CalculateLineMesh, createLine } from './line/lineMesh'
import { lineMeshPointArraySize } from './shaders/lineMeshShader'
import { CalculateISMesh, UpdateISMeshResolutionUniform, UpdateIsMeshCamera, hit_sphere } from './is/ISMesh'
import * as math from 'mathjs'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = -2

// let projMatrix = camera.projectionMatrix;

// console.log(2.0*Math.atan( 1.0/projMatrix.toArray()[5] ) * 180.0 / Math.PI)

const axesHelper = new THREE.AxesHelper( 1 );
scene.add( axesHelper );

// let forward = camera.getWorldDirection(new THREE.Vector3())
// let up = new THREE.Vector3(m[4], m[5], m[6])
// let right = camera.getWorldDirection(new THREE.Vector3());

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

let pList: Array<THREE.Vector3> = new Array<THREE.Vector3>();

for(let i = 0; i < lineMeshPointArraySize ; i ++) {
    pList.push(
        new THREE.Vector3(
            Math.sin(i / lineMeshPointArraySize * Math.PI * 2),
            0,
            Math.cos(i / lineMeshPointArraySize * Math.PI * 2)
    ))
}

console.log(math.simplify("([px,py,pz] + t*[dx,dy,dz] - [cx,cy,cz]) * ([px,py,pz] + t*[dx,dy,dz] - [cx,cy,cz]) - r^2").toString());

scene.add(CalculateISMesh())
scene.add(CalculateLineMesh(pList))

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    renderer.setSize(window.innerWidth, window.innerHeight)
    UpdateISMeshResolutionUniform()
    render()
}

function animate() {
    requestAnimationFrame(animate)

    controls.update()
    controls.enablePan = false;
    camera.updateMatrix()
    camera.updateMatrixWorld(true)
    camera.updateWorldMatrix(true, true)
    camera.updateProjectionMatrix()
    camera.up
    UpdateIsMeshCamera(camera)
    //console.log("Camera position")
    //console.log(camera.position)
    //console.log("Camera dir")
    //console.log(camera.getWorldDirection(new THREE.Vector3()))
    //console.log(camera.up)
    // console.log(hit_sphere(
    //     new THREE.Vector3(0,0,0),
    //     0.5,
    //     new THREE.Vector3(camera.position.x, camera.position.x, camera.position.x),
    //     camera.getWorldDirection(new THREE.Vector3())
    // ))
    let m = camera.matrixWorldInverse.toArray()
    //console.log("Camera mat")
    console.log(
        {
        row1: [m[0], m[4], m[8], m[12]],
        row2: [m[1], m[5], m[9], m[13]],
        row3: [m[2], m[6], m[10], m[14]],
        row4: [m[3], m[7], m[11], m[15]]
    })
    render()
}

function render() {
    renderer.render(scene, camera)
}
animate()
