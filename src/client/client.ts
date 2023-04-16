import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { DragControls } from 'three/examples/jsm/controls/DragControls'
import { CalculateLineMesh, createLine } from './line/lineMesh'
import { lineMeshPointArraySize } from './shaders/lineMeshShader'
import { CalculateISMesh, UpdateISMeshResolutionUniform, UpdateIsMeshCamera, hit_sphere } from './is/ISMesh'
import { testf } from './math'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = -2

const axesHelper = new THREE.AxesHelper( 1 );
scene.add( axesHelper );

const renderer = new THREE.WebGLRenderer()

renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const orbitControls = new OrbitControls(camera, renderer.domElement)
const dragControls = new DragControls([], camera, renderer.domElement)

// let pList: Array<THREE.Vector3> = [new THREE.Vector3(-2, 0, 0), new THREE.Vector3(2, 0, 0)];
let pList: Array<THREE.Vector3> = [];

// const curve = new THREE.CatmullRomCurve3( [
// 	new THREE.Vector3( -10, 0, 10 ).divideScalar(5),
// 	new THREE.Vector3( -5, 5, 5 ).divideScalar(5),
// 	new THREE.Vector3( 0, 0, 0 ).divideScalar(5),
// 	new THREE.Vector3( 5, -5, 5 ).divideScalar(5),
// 	new THREE.Vector3( 10, 0, 10 ).divideScalar(5)
// ] );

// const points = curve.getPoints( 20 );

const n = 20;

for(let i = 0; i < n ; i ++) {
    pList.push(
        new THREE.Vector3(
            Math.sin(i / n * Math.PI * 2) * 2,
            0,
            Math.cos(i / n * Math.PI * 2) * 2
    ))
}

// console.log(math.simplify("(ox+dx*t)^2 + (oy+dy*t)^2 + (oz+dz*t)^2 + (rx + ry + rz)^2").toString());

testf();

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

    orbitControls.update()
    orbitControls.enablePan = false
    UpdateIsMeshCamera(camera)

    render()
}

function render() {
    renderer.render(scene, camera)
}
animate()
