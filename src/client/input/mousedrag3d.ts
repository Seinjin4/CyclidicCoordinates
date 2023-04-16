// import {
//     Camera,
// 	EventDispatcher,
// 	Line3,
// 	Matrix4,
// 	Mesh,
// 	MeshBasicMaterial,
// 	Plane,
// 	Raycaster,
// 	SphereGeometry,
// 	Vector2,
// 	Vector3
// } from 'three';

// const _raycaster = new Raycaster();

// const _pointer = new Vector2();
// const _offset = new Vector3();
// const _intersection = new Vector3();
// const _worldPosition = new Vector3();
// const _inverseMatrix = new Matrix4();

// class DragObject {
//     sceneObject: Mesh;
//     draggingArea : Plane | Line3;

//     constructor(draggingArea: Plane | Line3) {
//         const geometry = new SphereGeometry(0.1, 10, 10);
//         const material = new MeshBasicMaterial({
//             color: 0xff0000 
//         })

//         this.sceneObject = new Mesh(geometry, material)
//         this.draggingArea = draggingArea
//     }
// }

// class DragControls extends EventDispatcher {
//     _objects: DragObject[];
//     _camera: Camera; 
//     _domElement: HTMLCanvasElement;
//     _selected: DragObject | null;
//     _hovered: DragObject | null;
//     _intersections: DragObject[];

//     enabled: boolean = true;

// 	constructor( objects: DragObject[], camera: Camera, domElement: HTMLCanvasElement ) {
// 		super();

//         this._objects = objects;
//         this._camera = camera;
//         this._domElement = domElement;
        
// 		this._domElement.style.touchAction = 'none'; // disable touch scroll

// 		this._selected = null
//         this._hovered = null;

// 		this._intersections = [];

// 		this.activate();
// 	}

//     public activate() {

//         this._domElement.addEventListener( 'pointermove', this.onPointerMove );
//         this._domElement.addEventListener( 'pointerdown', this.onPointerDown );
//         this._domElement.addEventListener( 'pointerup', this.onPointerCancel );
//         this._domElement.addEventListener( 'pointerleave', this.onPointerCancel );

//     }

//     public deactivate() {

//         this._domElement.removeEventListener( 'pointermove', this.onPointerMove );
//         this._domElement.removeEventListener( 'pointerdown', this.onPointerDown );
//         this._domElement.removeEventListener( 'pointerup', this.onPointerCancel );
//         this._domElement.removeEventListener( 'pointerleave', this.onPointerCancel );

//         this._domElement.style.cursor = '';
//     }

//     dispose() {

//         this.deactivate();

//     }

//     public getObjects() {

//         return this._objects;

//     }

//     public getRaycaster() {

//         return _raycaster;

//     }

//     onPointerMove( even: PointerEvent ) {

//         if ( this.scope.enabled === false ) return;

//         updatePointer( event );

//         _raycaster.setFromCamera( _pointer, _camera );

//         if ( _selected ) {

//             if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

//                 _selected.position.copy( _intersection.sub( _offset ).applyMatrix4( _inverseMatrix ) );

//             }

//             scope.dispatchEvent( { type: 'drag', object: _selected } );

//             return;

//         }

//         // hover support

//         if ( event.pointerType === 'mouse' || event.pointerType === 'pen' ) {

//             _intersections.length = 0;

//             _raycaster.setFromCamera( _pointer, _camera );
//             _raycaster.intersectObjects( _objects, true, _intersections );

//             if ( _intersections.length > 0 ) {

//                 const object = _intersections[ 0 ].object;

//                 _plane.setFromNormalAndCoplanarPoint( _camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( object.matrixWorld ) );

//                 if ( _hovered !== object && _hovered !== null ) {

//                     scope.dispatchEvent( { type: 'hoveroff', object: _hovered } );

//                     _domElement.style.cursor = 'auto';
//                     _hovered = null;

//                 }

//                 if ( _hovered !== object ) {

//                     scope.dispatchEvent( { type: 'hoveron', object: object } );

//                     _domElement.style.cursor = 'pointer';
//                     _hovered = object;

//                 }

//             } else {

//                 if ( _hovered !== null ) {

//                     scope.dispatchEvent( { type: 'hoveroff', object: _hovered } );

//                     _domElement.style.cursor = 'auto';
//                     _hovered = null;

//                 }

//             }

//         }

//     }

//     onPointerDown( event: MouseEvent ) {

//         if ( this.enabled === false ) return;

//         this.updatePointer( event );

//         this._intersections.length = 0;

//         _raycaster.setFromCamera( _pointer, this._camera );
//         _raycaster.intersectObjects( this._objects, true, this._intersections );

//         if ( this._intersections.length > 0 ) {

//             this._selected = this._intersections[ 0 ];

//             const plane = this._selected.draggingArea;

//             _plane.setFromNormalAndCoplanarPoint( this._camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

//             if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

//                 _inverseMatrix.copy( this._selected.sceneObject.parent.matrixWorld ).invert();
//                 _offset.copy( _intersection ).sub( _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

//             }

//             this._domElement.style.cursor = 'move';

//             this.dispatchEvent( { type: 'dragstart', object: this._selected } );

//         }


//     }

//     onPointerCancel() {

//         if ( this.enabled === false ) return;

//         if ( this._selected ) {

//             this.dispatchEvent( { type: 'dragend', object: this._selected } );

//             this._selected = null;

//         }

//         this._domElement.style.cursor = this._hovered ? 'pointer' : 'auto';

//     }

//     updatePointer( event: MouseEvent ) {

//         const rect = this._domElement.getBoundingClientRect();

//         _pointer.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
//         _pointer.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;

//     }

// }

// export { DragControls };