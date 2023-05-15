import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ImplicitSurfaceMesh } from "./is/ISMesh";
import { TubeMesh } from "./line/lineMesh";
import { coeffs, gradient } from "./shaders/ISRaytracingShader";
import { CalculateGradient } from "./math";
import { DragControls, DragObject } from "./input/DragControls";
import { GLSLType, Uniform } from "./shaders/ShaderGenerator";

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = -5
camera.position.y = 3

const axesHelper = new THREE.AxesHelper( 1 )
// scene.add( axesHelper )
scene.background = new THREE.Color( 0xffffff );

let orbitControls: OrbitControls
let dragControls: DragControls

// const aControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)))

// aControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
//     const newX = position.x > 0 ? Math.min(10, position.x) : 0
//     const newZ = 0
//     const newPos = new THREE.Vector3(newX, 0, newZ)
//     return newPos
// }

const bControl = new DragObject(new THREE.Plane(new THREE.Vector3(0.5, 0, 0.5)))

bControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const newY = position.y > 0 ? Math.min(10, position.y) : 0
    const newPos = new THREE.Vector3(0, newY, 0)
    return newPos
}

// scene.add(aControl.sceneObject)
scene.add(bControl.sceneObject)

const n = 500;

function calculateHyperbolePoints(a: number, b: number, c: number): THREE.Vector3[] {
    let hyperbolePList: THREE.Vector3[] = []
    for(let i = 0; i < n ; i ++) {
        const t = i / n - 0.5
        hyperbolePList.push(new THREE.Vector3(c * (1 + t * t) / (1 - t * t), 2 * b * t / (1 - t * t), 0))
    }
    console.log(hyperbolePList)
    return hyperbolePList
}

function calculateEllipsePoints(a: number, b: number, c: number): THREE.Vector3[] {
    let ellipsePList: THREE.Vector3[] = []
    for(let i = 0; i < n ; i ++) {
        ellipsePList.push(new THREE.Vector3(a * Math.cos(i / n * Math.PI * 2), 0, b * Math.sin(i / n * Math.PI * 2)))
    }
    return ellipsePList
}

let a = 1
let b = 1
// b^2 + c^2 = a^2
let c = Math.sqrt(a*a - b*b) 

let ellipsePList = calculateEllipsePoints(a, b, c)
let hyperbolePList = calculateHyperbolePoints(a, b, c)

const etube = new TubeMesh(12, 1000, true)
etube.setUniform("radius", 0.03)
etube.setUniform("objectColor", new THREE.Vector3(0.7, 0.3, 0.3))
etube.SetPoints(ellipsePList)

const htube = new TubeMesh(12, 1000, false)
htube.setUniform("radius", 0.03)
htube.setUniform("objectColor", new THREE.Vector3(0.3, 0.7, 0.3))
htube.SetPoints(hyperbolePList)

// aControl.addEventListener("positionchange", (event) => {
//     a = event.object.sceneObject.position.x
//     b = event.object.sceneObject.position.x
//     c = Math.sqrt(a*a - b*b) 
//     // c = 0
//     etube.SetPoints(calculateEllipsePoints(a,b,c))
//     htube.SetPoints(calculateHyperbolePoints(a,b,c))
// })

const PlaneEq = '5 * s * x + 5 * c * z'
const ConeEq = 'Uoa^2 * x^2 + Uob^2 * z^2 - (y - Ut)^2 * Uot^2'
const TorusEq = '(x^2+y^2+z^2)^2 - 2*(R^2 + r^2)*(x^2+y^2+z^2) + 4*R^2*y^2 + (R^2 - r^2)^2'

const TorusCoeff: coeffs = {
    t4: 'dd * dd',
    t3: '4.0f * d3o',
    t2: '2.0f * dd * (oo - (rr +RR)) + 4.0f * (od * od) + 4.0f * RR * (d.y*d.y)',
    t1: '4.0f * (oo - (rr + RR)) * od + 8.0f*RR*(o.y*d.y)',
    t0: '(oo - (rr + RR)) * (oo - (rr + RR)) - 4.0f*RR*(rr - o.y*o.y)'
}

const ConeCoeff: coeffs = {
    t0 : "Uoa * Uoa * o.x * o.x + Uoa * Uoa * o.z * o.z + 2.0 * Ut * o.y * Uot * Uot - o.y * o.y * Uot * Uot - Ut * Ut * Uot * Uot ",
    t1 : "2.0 * Ut * d.y * Uot * Uot + Uoa * Uoa * o.x * d.x + Uoa * Uoa * d.x * o.x + Uoa * Uoa * o.z * d.z + Uoa * Uoa * d.z * o.z - 2.0 * d.y * o.y * Uot * Uot ",
    t2 : "Uoa * Uoa * d.x * d.x + Uoa * Uoa * d.z * d.z - d.y * d.y * Uot * Uot ",
    t3 : "0.0 ",
    t4 : "0.0 "
}

const t = 1

const uniforms: Uniform[] = [
    {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.3, 0.8)}},
    {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.8, 0.3)}},
    {type: GLSLType.float, name: 'R', defaultValue: {value: a}},
    {type: GLSLType.float, name: 'r', defaultValue: {value: 0.5}},
    {type: GLSLType.float, name: 'c', defaultValue: {value: 5.0/2.0}},
    {type: GLSLType.float, name: 's', defaultValue: {value: 5.0/2.0 * 1.72}},
    {type: GLSLType.float, name: 'Ut', defaultValue: {value: t}},
    {type: GLSLType.float, name: 'Uot', defaultValue: {value: 1.0/t}},
    {type: GLSLType.float, name: 'Ua', defaultValue: {value: a}},
    {type: GLSLType.float, name: 'Uoa', defaultValue: {value: 1.0/a}},
    {type: GLSLType.float, name: 'Ub', defaultValue: {value: b}},
    {type: GLSLType.float, name: 'Uob', defaultValue: {value: 1.0/b}},
    {type: GLSLType.float, name: 'Uc', defaultValue: {value: c}},
    {type: GLSLType.float, name: 'Uoc', defaultValue: {value: 1.0/c}}
]

const is1 = new ImplicitSurfaceMesh(ConeCoeff, CalculateGradient(ConeEq), uniforms)
is1.setUniform('outsideColor', new THREE.Vector3(0.3, 1.0, 0.3))
is1.setUniform('insideColor', new THREE.Vector3(0.3, 0.8, 0.3))
const is2 = new ImplicitSurfaceMesh(TorusCoeff, CalculateGradient(PlaneEq), uniforms)
is2.setUniform('outsideColor', new THREE.Vector3(0.3, 0.3, 1.0))
is2.setUniform('insideColor', new THREE.Vector3(0.3, 0.3, 1.0))
const is3 = new ImplicitSurfaceMesh(TorusCoeff, CalculateGradient(TorusEq), uniforms)
is3.setUniform('outsideColor', new THREE.Vector3(1.0, 0.3, 0.3))
is3.setUniform('insideColor', new THREE.Vector3(0.8, 0.3, 0.3))

scene.add(is1.CreateMesh())
scene.add(is2.CreateMesh())
scene.add(is3.CreateMesh())

bControl.addEventListener("positionchange", (event) => {
    const newt = event.object.sceneObject.position.y
    is1.setUniform('Ut', newt)
    is1.setUniform('Uot', 1/newt)
    is2.setUniform('Ut', newt)
    is2.setUniform('Uot', 1/newt)
    is3.setUniform('Ut', newt)
    is3.setUniform('Uot', 1/newt)
})




scene.add(etube.CreateMesh())
scene.add(htube.CreateMesh())

export function OnWindowResize() {
    is1.UpdateResolution()
    is2.UpdateResolution()
    is3.UpdateResolution()
}

export function UpdateScene() {
    orbitControls.update()
    orbitControls.enablePan = false
}

export function CreateScene(renderer: THREE.WebGLRenderer): THREE.Scene {
    orbitControls = new OrbitControls(camera, renderer.domElement)
    dragControls = new DragControls([bControl], camera, renderer.domElement, orbitControls)
    return scene
}

export function GetCamera(): THREE.PerspectiveCamera 
{
    return camera
}