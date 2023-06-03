import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TubeMesh } from "./line/lineMesh";
import { DragControls, DragObject } from "./input/DragControls";
import { dpCurve } from "./SingularityCurves";

const scene = new THREE.Scene()
scene.background = new THREE.Color().setRGB(0.7,0.7,0.7)
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.z = -7
camera.position.y = 5
camera.position.x = -2

const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
const ambLight = new THREE.AmbientLight( 0xffffff, 0.6);
scene.add(dirLight)
scene.add(ambLight)

let a = 3;
let b = 1.9;
let c = Math.sqrt(a*a - b*b) 
const d = 2

const curveN = 500

const axesHelper = new THREE.AxesHelper( 1 )
scene.add( axesHelper )

let orbitControls: OrbitControls;
let dragControls: DragControls

const aControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 0, 1)), new THREE.Vector3(1, 0, 0))
const bControl = new DragObject(new THREE.Plane(new THREE.Vector3(0, 0, 1)), new THREE.Vector3(0, 1, 0))

aControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const bControlsY = bControl.sceneObject.position.y
    const newX = position.x < bControlsY ? Math.max(bControlsY + 0.001, position.x) : position.x
    const newPos = new THREE.Vector3(newX, 0, 0)
    return newPos
}

bControl.positionValidation = (position: THREE.Vector3) : THREE.Vector3 => {
    const aControlsX = aControl.sceneObject.position.x
    let newY = position.y < 0.1 ? Math.max(0.1, position.y) : position.y
    newY = newY > aControlsX ? Math.min(aControlsX, newY) : newY
    const newPos = new THREE.Vector3(0, newY, 0)
    return newPos
}

scene.add(aControl.sceneObject)
scene.add(bControl.sceneObject)

function OnAbcChange(a:number, b:number, c:number) {
    const singCurves = dpCurve(a, b, c, curveN)
    console.log(singCurves)
    c1.SetPoints(singCurves.xy)
    c2.SetPoints(singCurves.xz)
    c3.SetPoints(singCurves.yz)
}

const singCurves = dpCurve(0.01, 2, 1, curveN)
const c1 = new TubeMesh(12, curveN, true)
c1.setUniform("radius", 0.03)
c1.setUniform("objectColor", new THREE.Vector3(1, 0.7, 0.7))
c1.SetPoints(singCurves.xy)

const c2 = new TubeMesh(12, curveN, true)
c2.setUniform("radius", 0.03)
c2.setUniform("objectColor", new THREE.Vector3(0.7, 1, 0.7))
c2.SetPoints(singCurves.xz)

const c3 = new TubeMesh(12, curveN, true)
c3.setUniform("radius", 0.03)
c3.setUniform("objectColor", new THREE.Vector3(0.7, 0.7, 1))
c3.SetPoints(singCurves.yz)

aControl.addEventListener("positionchange", (event) => {
    c = - 1 / Math.pow(event.object.sceneObject.position.x, 2)
    a = (b+c)/(b*c*d - 1)
    OnAbcChange(a, b, c)
})

bControl.addEventListener("positionchange", (event) => {
    b = 1 / Math.pow(event.object.sceneObject.position.y, 2)
    OnAbcChange(a, b, c)
})

scene.add(c1.CreateMesh())
scene.add(c2.CreateMesh())
scene.add(c3.CreateMesh())

export function OnWindowResize() {

}

export function UpdateScene() {
    orbitControls.update()
    orbitControls.enablePan = false
}

export function CreateScene(renderer: THREE.WebGLRenderer): THREE.Scene
{
    orbitControls = new OrbitControls(camera, renderer.domElement)
    // orbitControls.target = new THREE.Vector3(1, 0, 1)
    dragControls = new DragControls([aControl, bControl], camera, renderer.domElement, orbitControls)
    return scene
}

export function GetCamera(): THREE.PerspectiveCamera 
{
    return camera
}