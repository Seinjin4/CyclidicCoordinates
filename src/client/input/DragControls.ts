import {
    Camera,
	Color,
	EventDispatcher,
	Line3,
	Material,
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	Plane,
	Raycaster,
	SphereGeometry,
	Vector2,
	Vector3
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const _raycaster = new Raycaster();

const _pointer = new Vector2();
const _intersection = new Vector3();

let controlInstance: DragControls;

class DragObject extends EventDispatcher {
    sceneObject: Mesh;
    draggingArea : Plane | Line3;
    enabled: boolean

    positionValidation: (pos: THREE.Vector3) => THREE.Vector3
    onHoverOn: () => void
    onHoverOff: () => void
    onDragStart: () => void
    onDragEnd: () => void
    onDrag: () => void

    constructor(draggingArea: Plane, position?: THREE.Vector3, sceneObject?: Mesh) {
        super()
        this.enabled = true
        this.positionValidation = this.DefaultPositionValidation
        this.onHoverOn = this.DefaultHoverOn
        this.onHoverOff = this.DefaultHoverOff
        this.onDragStart = this.EmptyAction
        this.onDragEnd = this.EmptyAction
        this.onDrag = this.EmptyAction

        if(sceneObject === undefined)
            this.sceneObject = this.CreateDefaultMesh()
        else
            this.sceneObject = sceneObject

        if(position !== undefined) 
            this.sceneObject.position.copy(position)

        this.draggingArea = draggingArea
    }

    CreateDefaultMesh(): THREE.Mesh {
        const geometry = new SphereGeometry(0.08, 10, 10);
        const material = new MeshLambertMaterial({
            color: new Color(0.5, 0.07, 1)
        })

        return new Mesh(geometry, material)
    }

    EmptyAction(): void {}

    DefaultHoverOn(): void {
        if(this.sceneObject.material instanceof MeshLambertMaterial)
        {
            this.sceneObject.material.color.setRGB(0.67, 0.14, 0.99)
        }
    }

    DefaultHoverOff(): void {
        if(this.sceneObject.material instanceof MeshLambertMaterial)
        {
            this.sceneObject.material.color.setRGB(0.5, 0.07, 1)
        }
    }

    DefaultPositionValidation(pos: THREE.Vector3): THREE.Vector3 {
        return pos
    }

    Move( intersection: THREE.Vector3) {
        const newPosition = this.positionValidation(intersection)
        if(newPosition != this.sceneObject.position)
            {
                this.sceneObject.position.copy(newPosition)
                this.dispatchEvent({type: "positionchange", object: this})
            }
    }
}

function updatePointer( event: MouseEvent ) {
    const rect = controlInstance._domElement.getBoundingClientRect();

    _pointer.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
    _pointer.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;

}

function onPointerMove( event: PointerEvent ) {

    if ( controlInstance.enabled === false ) return

    updatePointer(event)

    _raycaster.setFromCamera( _pointer, controlInstance._camera );

    if ( controlInstance._selected ) {
        if(controlInstance._selected.draggingArea instanceof Plane) {
            const plane = controlInstance._selected.draggingArea

            if ( _raycaster.ray.intersectPlane( plane, _intersection ) ) {

                controlInstance._selected.Move(_intersection)
            }

            controlInstance.dispatchEvent( { type: 'drag', object: controlInstance._selected } );

            return;
        }
    }

    // hover support

    if ( event.pointerType === 'mouse' || event.pointerType === 'pen' ) {

        controlInstance._intersections.length = 0;

        _raycaster.setFromCamera( _pointer, controlInstance._camera );
        controlInstance._intersections = _raycaster.intersectObjects( controlInstance._objects.map(x => x.sceneObject), true);

        if ( controlInstance._intersections.length > 0 ) {

            const object = controlInstance._objects.find(x => x.sceneObject.id == controlInstance._intersections[ 0 ].object.id  && x.enabled);
            if(object === undefined)
                return

            if ( controlInstance._hovered !== object && controlInstance._hovered !== undefined ) {

                controlInstance.dispatchEvent( { type: 'hoveroff', object: controlInstance._hovered } );

                if(controlInstance._orbitControls !== undefined)
                    controlInstance._orbitControls.enabled = true

                controlInstance._domElement.style.cursor = 'auto';
                controlInstance._hovered = undefined;

            }

            if ( controlInstance._hovered !== object ) {

                controlInstance.dispatchEvent( { type: 'hoveron', object: object } );

                if(controlInstance._orbitControls !== undefined)
                    controlInstance._orbitControls.enabled = false

                controlInstance._domElement.style.cursor = 'pointer';
                controlInstance._hovered = object;

            }

        } else {

            if ( controlInstance._hovered !== undefined ) {

                controlInstance.dispatchEvent( { type: 'hoveroff', object: controlInstance._hovered } );

                if(controlInstance._orbitControls !== undefined)
                        controlInstance._orbitControls.enabled = true

                controlInstance._domElement.style.cursor = 'auto';
                controlInstance._hovered = undefined;

            }

        }

    }

}

function onPointerDown( event: MouseEvent ) {

    if ( controlInstance.enabled === false ) return;

    updatePointer(event);

    controlInstance._intersections.length = 0;

    _raycaster.setFromCamera( _pointer, controlInstance._camera );

    controlInstance._intersections = _raycaster.intersectObjects( controlInstance._objects.map(x => x.sceneObject), true);

    if ( controlInstance._intersections.length > 0 ) {

        controlInstance._selected = controlInstance._objects.find(x => x.sceneObject.id == controlInstance._intersections[ 0 ].object.id && x.enabled);
        if(controlInstance._selected === undefined)
            return
            
        if(controlInstance._selected.draggingArea instanceof Plane) {
            const plane = controlInstance._selected.draggingArea

            if ( _raycaster.ray.intersectPlane( plane, _intersection ) ) {
                controlInstance._selected.Move(_intersection)
            }

            controlInstance._domElement.style.cursor = 'move';

            controlInstance.dispatchEvent( { type: 'dragstart', object: controlInstance._selected } );
            }


    }


}

function onPointerCancel() {

    if ( controlInstance.enabled === false ) return;

    if ( controlInstance._selected ) {

        controlInstance.dispatchEvent( { type: 'dragend', object: controlInstance._selected } );

        controlInstance._selected = undefined;

    }

    controlInstance._domElement.style.cursor = controlInstance._hovered ? 'pointer' : 'auto';
}


class DragControls extends EventDispatcher {
    _objects: DragObject[];
    _camera: Camera; 
    _domElement: HTMLCanvasElement;
    _selected: DragObject | undefined;
    _hovered: DragObject | undefined;
    _intersections: THREE.Intersection<THREE.Object3D<Event>>[];
    _orbitControls: OrbitControls | undefined;

    enabled: boolean = true;

	constructor( objects: DragObject[], camera: Camera, domElement: HTMLCanvasElement, orbitControls: OrbitControls | undefined ) {
		super();

        this._objects = objects;
        this._camera = camera;
        this._domElement = domElement;
        this._orbitControls = orbitControls
		this._domElement.style.touchAction = 'none'; // disable touch scroll

		this._intersections = [];

        controlInstance = this

		this.activate();
	}

    public activate() {

        this._domElement.addEventListener( 'pointermove', onPointerMove );
        this._domElement.addEventListener( 'pointerdown', onPointerDown );
        this._domElement.addEventListener( 'pointerup', onPointerCancel );
        this._domElement.addEventListener( 'pointerleave', onPointerCancel );

        this.addEventListener('dragstart', (event) => event.object.onDragStart())
        this.addEventListener('dragend', (event) => event.object.onDragEnd())
        this.addEventListener('drag', (event) => event.object.onDrag())
        this.addEventListener('hoveron', (event) => event.object.onHoverOn())
        this.addEventListener('hoveroff', (event) => event.object.onHoverOff())
    }

    public deactivate() {

        this._domElement.removeEventListener( 'pointermove', onPointerMove );
        this._domElement.removeEventListener( 'pointerdown', onPointerDown );
        this._domElement.removeEventListener( 'pointerup', onPointerCancel );
        this._domElement.removeEventListener( 'pointerleave', onPointerCancel );

        this._domElement.style.cursor = '';
    }

    dispose() {

        this.deactivate();

    }

    public getObjects() {

        return this._objects;

    }

    public getRaycaster() {

        return _raycaster;

    }
}

export { DragControls, DragObject };