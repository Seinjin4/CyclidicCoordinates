const infEdge = 100

function x(t: number, a: number, b: number, c: number): number {
    return Math.sqrt(t * (t + a + b)/(a * b * c))
}

function y(t: number, a: number, b: number, c: number): number {
    return Math.sqrt((t + a) * (c - t) / (a * b * c))
}

function calcXRange(a: number, b: number, c: number): number[] {
    const abcMult = a * b * c;
    const ab = a + b;
    let result: number[] = [];
    if(abcMult != 0) {

        if(abcMult < 0) {
            if(ab > 0) {
                
                result = result.concat( [-ab, 0])
                result = result.concat( [0, -ab])
            }
        }
        else {
            if(ab > 0) {

                result = result.concat( [-infEdge, -ab])
                result = result.concat( [0, infEdge])
            }
            else {
                
                result = result.concat( [-infEdge, 0])
                result = result.concat( [-ab, infEdge])
            }
        }   
    }             
    return result
}

function calcYRange(a: number, b: number, c: number): number[] {
    const abcMult = a * b * c;
    let result: number[] = [];
    if(abcMult != 0) {
        if(abcMult < 0) {
            result = result.concat( [-infEdge, Math.min(...[-a,c])] )
            result = result.concat( [Math.max(...[-a,c]), infEdge] )
        }
        else {
            result = result.concat( [Math.min(...[-a,c]), Math.max(...[-a,c])] )
        }   
    }             
    return result
}

// function xyIntersect(xrange, yrange) := (
//     result = [];
//     repeat(length(xrange), i,
//         repeat(length(yrange), j,
//             if(xrange_i_1 > yrange_j_1 & xrange_i_1 < yrange_j_2,
//                 result = result :> [xrange_i_1, min([xrange_i_2, yrange_j_2])];,
//             );
//             if(yrange_j_1 > xrange_i_1 & yrange_j_1 < xrange_i_2,
//                 result = result :> [yrange_j_1, min([yrange_j_2, xrange_i_2])];,
//             );
//         );
//     );
//     result
// );

function dpCurve(a: number, b: number, c: number, n: number) {

}