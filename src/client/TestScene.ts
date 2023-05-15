import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ImplicitSurfaceMesh } from "./is/ISMesh";
import { TubeMesh } from "./line/lineMesh";
import { coeffs, gradient } from "./shaders/ISRaytracingShader";
import { CalculateGradient, GetEqData, testf } from "./math";
import { GLSLType, Uniform } from "./shaders/ShaderGenerator";
import { DragControls, DragObject } from "./input/DragControls";
import { calculateEllipsePoints, calculateHyperbolePoints } from "./CoordinateSystemFunctions";

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.z = -2
camera.position.y = 1

const axesHelper = new THREE.AxesHelper( 1 )
scene.add( axesHelper )

let orbitControls: OrbitControls;
let dragControls: DragControls

const aControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)))

aControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const newX = position.x > 3 ? Math.min(10, position.x) : 3
    const newZ = 0
    const newPos = new THREE.Vector3(newX, 0, newZ)
    return newPos
}

const bControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 1, 0)))

bControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const newX = 0
    const newZ = position.z > 0 ? Math.min(10, position.z) : 0
    const newPos = new THREE.Vector3(newX, 0, newZ)
    return newPos
}

scene.add(aControl.sceneObject)
scene.add(bControl.sceneObject)

const eConeEq = '4*Ub^2*Ut^2*Ua^2+(4*Ua^2*Ut^3*Ub-4*Ub*Ut*Ua^2)*y-4*Ut^2*Ua^2*z^2-4*Ub^2*Ut^2*x^2+(4*Ub*Ut^3*Usqrt+4*Ub*Ut*Usqrt)*x*y+(-4*Ua^2*Ut^2+2*Ub^2*Ut^2+Ub^2*Ut^4+Ub^2)2Ua*y^2'
const hConeEq = '-Ua^2*Ub^2*Usinphi^2+Ub^4*Usinphi^2+(2*Ua^2*Ub*Usinphi-2*Ub^3*Usinphi)*z+(-Usinphi^2*Ua^2+Ub^2*Usinphi^2)*y^2+Ub^2*Usinphi^2*x^2+(-Ua^2+Ua^2*Ucosphi^2+Ub^2)*z^2-2*Ub*Usinphi*Ua*Ucosphi*x*z'
const CyclideEq = '(x^2 + y^2 + z^2 + Ub^2 - Ur^2)^2 - 4*((Ua*x - Uc*Ur)^2 + Ub^2*y^2)'

const eConeCoeff: coeffs = {
    t0 : "4.0*Usqrt*Ut*Ut*Ut*Ub*o.x*o.y + 4.0*Usqrt*Ut*Ub*o.x*o.y + Ut*Ut*Ut*Ut*Ub*Ub*o.y*o.y + 4.0*Ut*Ut*Ut*Ua*Ua*Ub*o.y + 4.0*Ut*Ut*Ua*Ua*Ub*Ub - 4.0*Ut*Ut*Ua*Ua*o.z*o.z - 4.0*Ut*Ut*Ua*Ua*o.y*o.y - 4.0*Ut*Ut*Ub*Ub*o.x*o.x + 2.0*Ut*Ut*Ub*Ub*o.y*o.y - 4.0*Ut*Ua*Ua*Ub*o.y + Ub*Ub*o.y*o.y",
    t1 : "4.0*Usqrt*Ut*Ut*Ut*Ub*d.x*o.y + 4.0*Usqrt*Ut*Ut*Ut*Ub*d.y*o.x + 4.0*Usqrt*Ut*Ub*d.x*o.y + 4.0*Usqrt*Ut*Ub*d.y*o.x + 2.0*Ut*Ut*Ut*Ut*Ub*Ub*d.y*o.y + 4.0*Ut*Ut*Ut*Ua*Ua*Ub*d.y - 8.0*Ut*Ut*Ua*Ua*d.z*o.z - 8.0*Ut*Ut*Ua*Ua*d.y*o.y - 8.0*Ut*Ut*Ub*Ub*d.x*o.x + 4.0*Ut*Ut*Ub*Ub*d.y*o.y - 4.0*Ut*Ua*Ua*Ub*d.y + 2.0*Ub*Ub*d.y*o.y",
    t2 : "4.0*Usqrt*Ut*Ut*Ut*Ub*d.x*d.y + 4.0*Usqrt*Ut*Ub*d.x*d.y + Ut*Ut*Ut*Ut*Ub*Ub*d.y*d.y - 4.0*Ut*Ut*Ua*Ua*d.z*d.z - 4.0*Ut*Ut*Ua*Ua*d.y*d.y - 4.0*Ut*Ut*Ub*Ub*d.x*d.x + 2.0*Ut*Ut*Ub*Ub*d.y*d.y + Ub*Ub*d.y*d.y",
    t3 : "0.0 ",
    t4 : "0.0 "
}

let a = 5;
let b = 9/2;
let c = Math.sqrt(a*a - b*b) 

let eConeMesh: ImplicitSurfaceMesh;
let hConeMesh: ImplicitSurfaceMesh;
let CyclideMesh: ImplicitSurfaceMesh;

{
    const eConeCoeff: coeffs = {
        t0 : "4.0*Usqrt*Ut*Ut*Ut*Ub*o.x*o.y + 4.0*Usqrt*Ut*Ub*o.x*o.y + Ut*Ut*Ut*Ut*Ub*Ub*o.y*o.y + 4.0*Ut*Ut*Ut*Ua*Ua*Ub*o.y + 4.0*Ut*Ut*Ua*Ua*Ub*Ub - 4.0*Ut*Ut*Ua*Ua*o.z*o.z - 4.0*Ut*Ut*Ua*Ua*o.y*o.y - 4.0*Ut*Ut*Ub*Ub*o.x*o.x + 2.0*Ut*Ut*Ub*Ub*o.y*o.y - 4.0*Ut*Ua*Ua*Ub*o.y + Ub*Ub*o.y*o.y",
        t1 : "4.0*Usqrt*Ut*Ut*Ut*Ub*d.x*o.y + 4.0*Usqrt*Ut*Ut*Ut*Ub*d.y*o.x + 4.0*Usqrt*Ut*Ub*d.x*o.y + 4.0*Usqrt*Ut*Ub*d.y*o.x + 2.0*Ut*Ut*Ut*Ut*Ub*Ub*d.y*o.y + 4.0*Ut*Ut*Ut*Ua*Ua*Ub*d.y - 8.0*Ut*Ut*Ua*Ua*d.z*o.z - 8.0*Ut*Ut*Ua*Ua*d.y*o.y - 8.0*Ut*Ut*Ub*Ub*d.x*o.x + 4.0*Ut*Ut*Ub*Ub*d.y*o.y - 4.0*Ut*Ua*Ua*Ub*d.y + 2.0*Ub*Ub*d.y*o.y",
        t2 : "4.0*Usqrt*Ut*Ut*Ut*Ub*d.x*d.y + 4.0*Usqrt*Ut*Ub*d.x*d.y + Ut*Ut*Ut*Ut*Ub*Ub*d.y*d.y - 4.0*Ut*Ut*Ua*Ua*d.z*d.z - 4.0*Ut*Ut*Ua*Ua*d.y*d.y - 4.0*Ut*Ut*Ub*Ub*d.x*d.x + 2.0*Ut*Ut*Ub*Ub*d.y*d.y + Ub*Ub*d.y*d.y",
        t3 : "0.0 ",
        t4 : "0.0 "
    }

    const eConeGrad: gradient = {
        x: '-8.0*Ub*Ub*Ut*Ut*x + y*(4.0*Ub*Usqrt*Ut*Ut*Ut + 4.0*Ub*Usqrt*Ut)' ,
        y: '4.0*Ua*Ua*Ub*Ut*Ut*Ut - 4.0*Ua*Ua*Ub*Ut + x*(4.0*Ub*Usqrt*Ut*Ut*Ut + 4.0*Ub*Usqrt*Ut) + 2.0*y*(-4.0*Ua*Ua*Ut*Ut + Ub*Ub*Ut*Ut*Ut*Ut + 2.0*Ub*Ub*Ut*Ut + Ub*Ub)' ,
        z: '-8.0*Ua*Ua*Ut*Ut*z' 
    }

    const t = 1/5;

    const uniforms: Uniform[] = [
        {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(0.3, 1.0, 0.3)}},
        {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.8, 0.3)}},
        {type: GLSLType.float, name: 'Ut', defaultValue: {value: t}},
        {type: GLSLType.float, name: 'Ua', defaultValue: {value: a}},
        {type: GLSLType.float, name: 'Ub', defaultValue: {value: b}},
        {type: GLSLType.float, name: 'Uc', defaultValue: {value: c}},
        {type: GLSLType.float, name: 'Usqrt', defaultValue: {value: Math.sqrt((a-b)*(a+b))}},
    ]

    eConeMesh = new ImplicitSurfaceMesh(eConeCoeff, eConeGrad, uniforms)
}

{
    const hConeCoeff: coeffs = {
        t0 : "-Ua*Ua*Ub*Ub*Usinphi*Usinphi + 2.0*Ua*Ua*Ub*Usinphi*o.z + Ua*Ua*Ucosphi*Ucosphi*o.z*o.z - Ua*Ua*Usinphi*Usinphi*o.y*o.y - Ua*Ua*o.z*o.z - 2.0*Ua*Ub*Ucosphi*Usinphi*o.x*o.z + Ub*Ub*Ub*Ub*Usinphi*Usinphi - 2.0*Ub*Ub*Ub*Usinphi*o.z + Ub*Ub*Usinphi*Usinphi*o.x*o.x + Ub*Ub*Usinphi*Usinphi*o.y*o.y + Ub*Ub*o.z*o.z",
        t1 : "2.0*Ua*Ua*Ub*Usinphi*d.z + 2.0*Ua*Ua*Ucosphi*Ucosphi*d.z*o.z - 2.0*Ua*Ua*Usinphi*Usinphi*d.y*o.y - 2.0*Ua*Ua*d.z*o.z - 2.0*Ua*Ub*Ucosphi*Usinphi*d.x*o.z - 2.0*Ua*Ub*Ucosphi*Usinphi*d.z*o.x - 2.0*Ub*Ub*Ub*Usinphi*d.z + 2.0*Ub*Ub*Usinphi*Usinphi*d.x*o.x + 2.0*Ub*Ub*Usinphi*Usinphi*d.y*o.y + 2.0*Ub*Ub*d.z*o.z",
        t2 : "Ua*Ua*Ucosphi*Ucosphi*d.z*d.z - Ua*Ua*Usinphi*Usinphi*d.y*d.y - Ua*Ua*d.z*d.z - 2.0*Ua*Ub*Ucosphi*Usinphi*d.x*d.z + Ub*Ub*Usinphi*Usinphi*d.x*d.x + Ub*Ub*Usinphi*Usinphi*d.y*d.y + Ub*Ub*d.z*d.z",
        t3 : "0.0 ",
        t4 : "0.0 "
    } 

    const hConeGrad: gradient = {
        x: '2.0 * Ub * Ub * Usinphi * Usinphi * x - 2.0 * z * Ub * Usinphi * Ua * Ucosphi' ,
        y: '2.0 * Usinphi * Usinphi * (Ub * Ub - Ua * Ua) * y' ,
        z: '2.0 * (Ua * Ua * Ub * Usinphi + (Ua * Ua * (Ucosphi * Ucosphi - 1.0) + Ub * Ub) * z) - 2.0 * Usinphi * (Ub * Ua * Ucosphi * x + Ub * Ub * Ub)' 
    }

    const phi = Math.PI / 180 * 45

    const uniforms: Uniform[] = [
        {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.3, 1.0)}},
        {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(0.3, 0.3, 1.0)}},
        {type: GLSLType.float, name: 'Ua', defaultValue: {value: a}},
        {type: GLSLType.float, name: 'Ub', defaultValue: {value: b}},
        {type: GLSLType.float, name: 'Uc', defaultValue: {value: c}},
        {type: GLSLType.float, name: 'Usinphi', defaultValue: {value: Math.sin(phi)}},
        {type: GLSLType.float, name: 'Ucosphi', defaultValue: {value: Math.cos(phi)}}
    ]

    hConeMesh = new ImplicitSurfaceMesh(hConeCoeff, hConeGrad, uniforms)
}

{
    const CyclideCoeff: coeffs = {
        t4: 'd.x*d.x*d.x*d.x + 2.0*d.x*d.x*d.z*d.z + 2.0*d.x*d.x*d.y*d.y + d.z*d.z*d.z*d.z + 2.0*d.z*d.z*d.y*d.y + d.y*d.y*d.y*d.y',
        t3: '4.0*d.x*d.x*d.x*o.x + 4.0*d.x*d.x*d.z*o.z + 4.0*d.x*d.x*d.y*o.y + 4.0*d.x*d.z*d.z*o.x + 4.0*d.x*d.y*d.y*o.x + 4.0*d.z*d.z*d.z*o.z + 4.0*d.z*d.z*d.y*o.y + 4.0*d.z*d.y*d.y*o.z + 4.0*d.y*d.y*d.y*o.y',
        t2: '-4.0*Ua*Ua*d.x*d.x + 2.0*Ub*Ub*d.x*d.x - 2.0*Ub*Ub*d.z*d.z + 2.0*Ub*Ub*d.y*d.y + 6.0*d.x*d.x*o.x*o.x + 2.0*d.x*d.x*o.z*o.z + 2.0*d.x*d.x*o.y*o.y - 2.0*d.x*d.x*Ur*Ur + 8.0*d.x*d.z*o.x*o.z + 8.0*d.x*d.y*o.x*o.y + 2.0*d.z*d.z*o.x*o.x + 6.0*d.z*d.z*o.z*o.z + 2.0*d.z*d.z*o.y*o.y - 2.0*d.z*d.z*Ur*Ur + 8.0*d.z*d.y*o.z*o.y + 2.0*d.y*d.y*o.x*o.x + 2.0*d.y*d.y*o.z*o.z + 6.0*d.y*d.y*o.y*o.y - 2.0*d.y*d.y*Ur*Ur',
        t1: '-8.0*Ua*Ua*d.x*o.x + 8.0*Ua*Uc*d.x*Ur + 4.0*Ub*Ub*d.x*o.x - 4.0*Ub*Ub*d.z*o.z + 4.0*Ub*Ub*d.y*o.y + 4.0*d.x*o.x*o.x*o.x + 4.0*d.x*o.x*o.z*o.z + 4.0*d.x*o.x*o.y*o.y - 4.0*d.x*o.x*Ur*Ur + 4.0*d.z*o.x*o.x*o.z + 4.0*d.z*o.z*o.z*o.z + 4.0*d.z*o.z*o.y*o.y - 4.0*d.z*o.z*Ur*Ur + 4.0*d.y*o.x*o.x*o.y + 4.0*d.y*o.z*o.z*o.y + 4.0*d.y*o.y*o.y*o.y - 4.0*d.y*o.y*Ur*Ur',
        t0: '-4.0*Ua*Ua*o.x*o.x + 8.0*Ua*Uc*o.x*Ur + Ub*Ub*Ub*Ub + 2.0*Ub*Ub*o.x*o.x - 2.0*Ub*Ub*o.z*o.z + 2.0*Ub*Ub*o.y*o.y - 2.0*Ub*Ub*Ur*Ur - 4.0*Uc*Uc*Ur*Ur + o.x*o.x*o.x*o.x + 2.0*o.x*o.x*o.z*o.z + 2.0*o.x*o.x*o.y*o.y - 2.0*o.x*o.x*Ur*Ur + o.z*o.z*o.z*o.z + 2.0*o.z*o.z*o.y*o.y - 2.0*o.z*o.z*Ur*Ur + o.y*o.y*o.y*o.y - 2.0*o.y*o.y*Ur*Ur + Ur*Ur*Ur*Ur'
    }

    const CyclideGrad: gradient = {
        x: '-8.0*Ua*(Ua*x - Uc*Ur) + 4.0*x*(Ub*Ub - Ur*Ur + x*x + y*y + z*z)' ,
        y: '4.0*y*(Ub*Ub - Ur*Ur + x*x + y*y + z*z)' ,
        z: '-8.0*Ub*Ub*z + 4.0*z*(Ub*Ub - Ur*Ur + x*x + y*y + z*z)' 
    }

    const uniforms: Uniform[] = [
        {type: GLSLType.vec3, name: 'outsideColor', defaultValue: {value: new THREE.Vector3(1.0, 0.3, 0.3)}},
        {type: GLSLType.vec3, name: 'insideColor', defaultValue: {value: new THREE.Vector3(0.8, 0.3, 0.3)}},
        {type: GLSLType.float, name: 'Ur', defaultValue: {value: 1.0}},
        {type: GLSLType.float, name: 'Ua', defaultValue: {value: a}},
        {type: GLSLType.float, name: 'Ub', defaultValue: {value: b}},
        {type: GLSLType.float, name: 'Uc', defaultValue: {value: c}},
    ]

    CyclideMesh = new ImplicitSurfaceMesh(CyclideCoeff, CyclideGrad, uniforms)
}

const etube = new TubeMesh(12, 1000, true)
etube.setUniform("radius", 0.03)
etube.setUniform("objectColor", new THREE.Vector3(0.7, 0.3, 0.3))
etube.SetPoints(calculateEllipsePoints(a, b, c))

const htube = new TubeMesh(12, 1000, false)
htube.setUniform("radius", 0.03)
htube.setUniform("objectColor", new THREE.Vector3(0.3, 0.7, 0.3))
htube.SetPoints(calculateHyperbolePoints(a, b, c))

aControl.addEventListener("positionchange", (event) => {
    a = event.object.sceneObject.position.x
    c = Math.sqrt(a*a - b*b) 
    eConeMesh.setUniform('Ua', a)
    eConeMesh.setUniform('Uc', c)
    eConeMesh.setUniform('Usqrt', Math.sqrt((a-b)*(a+b)))
    hConeMesh.setUniform('Ua', a)
    hConeMesh.setUniform('Uc', c)
    CyclideMesh.setUniform('Ua', a)
    CyclideMesh.setUniform('Uc', c)
    htube.SetPoints(calculateHyperbolePoints(a, b, c))
    etube.SetPoints(calculateEllipsePoints(a, b, c))
})

bControl.addEventListener("positionchange", (event) => {
    b = event.object.sceneObject.position.z
    c = Math.sqrt(a*a - b*b) 
    eConeMesh.setUniform('Ub', b)
    eConeMesh.setUniform('Uc', c)
    eConeMesh.setUniform('Usqrt', Math.sqrt((a-b)*(a+b)))
    hConeMesh.setUniform('Ub', b)
    hConeMesh.setUniform('Uc', c)
    CyclideMesh.setUniform('Ub', b)
    CyclideMesh.setUniform('Uc', c)

    htube.SetPoints(calculateHyperbolePoints(a, b, c))
    etube.SetPoints(calculateEllipsePoints(a, b, c))
})

scene.add(eConeMesh.CreateMesh())
scene.add(hConeMesh.CreateMesh())
scene.add(CyclideMesh.CreateMesh())

scene.add(etube.CreateMesh())
scene.add(htube.CreateMesh())

export function OnWindowResize() {
    eConeMesh.UpdateResolution()
    hConeMesh.UpdateResolution()
    CyclideMesh.UpdateResolution()
}

export function UpdateScene() {
    orbitControls.update()
    orbitControls.enablePan = false
}

export function CreateScene(renderer: THREE.WebGLRenderer): THREE.Scene
{
    orbitControls = new OrbitControls(camera, renderer.domElement)
    dragControls = new DragControls([aControl, bControl], camera, renderer.domElement, orbitControls)
    return scene
}

export function GetCamera(): THREE.PerspectiveCamera 
{
    return camera
}