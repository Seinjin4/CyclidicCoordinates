import * as math from "mathjs"

enum Nodes{
    functionNode = "FunctionNode",
    operatorNode = "OperatorNode",
    constantNode = "ConstantNode",
    symbolNode = "SymbolNode"
}

enum ops{
    subtract = "-",
    add = "+",
    multiply = "*",
    devide = "/",
    pow = "^"
}

const t: string = "t"

function IsMultiplication(node: math.OperatorNode): boolean {
    return node.op == ops.multiply
}

function IsSum(node: math.OperatorNode): boolean {
    return node.op == ops.add || node.op == ops.subtract
}

function GetMultiplicationTPower(node: math.OperatorNode): number {
    const filter = node.filter(function (cnode) {
        return PowerOfVariable(cnode) > 0
    })

    if(filter.length == 0)
        return 0;

    const powers = filter.map(x => PowerOfVariable(x))

    return Math.max(...powers)
}

function PowerOfVariable(node: math.MathNode): number {
    if(node instanceof math.SymbolNode)
        if(node.name == t)
            return 1

    if(!(node instanceof math.OperatorNode))
        return -1

    if(node.op != ops.pow)
        return -1

    if(node.args[0] instanceof math.SymbolNode && node.args[1] instanceof math.ConstantNode)
        if(node.args[0].name == t)
            return node.args[1].value

    if(node.args[1] instanceof math.SymbolNode && node.args[0] instanceof math.ConstantNode)
        if(node.args[1].name == t)
            return node.args[0].value

    return -1
}

function pickWithVariable(node: math.MathNode, tPower: number): math.MathNode {
    if(!(node instanceof math.OperatorNode))
    {
        if(tPower == 0)
            return node
        else
            return math.parse('0');
    }
    
    let newLNode: math.MathNode
    let newRNode: math.MathNode

    if(IsMultiplication(node.args[0]))
    {
        if(GetMultiplicationTPower(node.args[0]) == tPower)
        {
            newLNode = node.args[0];
        }
        else
        {
            newLNode = math.parse('0');
        }
    }
    else
    {
        newLNode = pickWithVariable(node.args[0], tPower)
    }

    if(IsMultiplication(node.args[1]))
    {
        if(GetMultiplicationTPower(node.args[1]) == tPower)
        {
            newRNode = node.args[1];
        }
        else
        {
            newRNode = math.parse('0');
        }
    }
    else
    {
        newRNode = pickWithVariable(node.args[1], tPower)
    }

    return new math.OperatorNode(node.op, node.fn, [newLNode, newRNode])
}

function tryAddParenthesis(node: math.OperatorNode): math.OperatorNode {
    if(node.op != ops.multiply)
        return node
    
    if(node.args[0] instanceof math.SymbolNode)
    {
        if(node.args[0].name == t)
        {
            return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[1]), node.args[0]])
        }
    }
    else if(node.args[1] instanceof math.SymbolNode)
    {
        if(node.args[1].name == t)
        {
            return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[0]), node.args[1]])
        }
    }
    
    if(node.args[0] instanceof math.OperatorNode)
    {
        if(node.args[0].op == ops.pow)
        {
            if(node.args[0].args[0] instanceof math.SymbolNode)
                if(node.args[0].args[0] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[1]), node.args[0]])
                }
            if(node.args[0].args[1] instanceof math.SymbolNode)
                if(node.args[0].args[1] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[1]), node.args[0]])
                }
        }
    }
    else if(node.args[1] instanceof math.OperatorNode)
    {
        if(node.args[1].op == ops.pow)
        {
            if(node.args[1].args[0] instanceof math.SymbolNode)
                if(node.args[1].args[0] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[0]), node.args[1]])
                }
            if(node.args[1].args[1] instanceof math.SymbolNode)
                if(node.args[1].args[1] .name == t)
                {
                    return new math.OperatorNode(node.op, node.fn, [new math.ParenthesisNode(node.args[0]), node.args[1]])
                }
        }
    }

    return node
}

function mergeParenthesis(lNode: math.ParenthesisNode, rNode: math.ParenthesisNode, oldOp: math.OperatorNode): math.ParenthesisNode {

    return new math.ParenthesisNode(new math.OperatorNode(oldOp.op, oldOp.fn, [lNode.content, rNode.content]))
}

function tryMergeParenthesis(node: math.OperatorNode): math.OperatorNode {
    if(node.op == ops.multiply || node.op == ops.devide)
        return node

    if(!(node.args[0] instanceof math.OperatorNode) || !(node.args[1] instanceof math.OperatorNode))
        return node

    let l = node.args[0]
    let r = node.args[1]

    let tNode: math.MathNode

    let lt: number
    let lCoeff: math.ParenthesisNode

    let rt: number
    let rCoeff: math.ParenthesisNode

    if(l.args[0] instanceof math.ParenthesisNode && PowerOfVariable(l.args[1]) > 0)
        {
            tNode = l.args[1]
            lt = PowerOfVariable(l.args[1])
            lCoeff = l.args[0]
        }
    else if(l.args[1] instanceof math.ParenthesisNode && PowerOfVariable(l.args[0]) > 0)
        {
            tNode = l.args[0]
            lt = PowerOfVariable(l.args[0])
            lCoeff = l.args[1]
        }
    else
        return node

    if(r.args[0] instanceof math.ParenthesisNode && PowerOfVariable(r.args[1]) > 0)
        {
            rt = PowerOfVariable(r.args[1])
            rCoeff = r.args[0]
        }
    else if(r.args[1] instanceof math.ParenthesisNode && PowerOfVariable(r.args[0]) > 0)
        {
            rt = PowerOfVariable(r.args[0])
            rCoeff = r.args[1]
        }
    else
        return node
    
    if(rt != lt)
        return node
    
    let newNode = new math.ParenthesisNode(new math.OperatorNode(node.op, node.fn, [lCoeff.content, rCoeff.content]))

    return new math.OperatorNode("*" as never, "multiply" as never, [newNode, tNode])
}

function convertToPolynomialFormat(node: math.MathNode): math.MathNode {

    return node;
}

export function testf(): void {
    //const eq = "(x^2+y^2+z^2)^2 - 2*(R^2 + r^2)*(x^2+y^2+z^2) + 4*R^2*y^2 + (R^2 - r^2)^2"
    const eq = "x^2 + y^2 + z^2 - r^2"
    //const eq = "(x)*t^2 + z +(y)*t^2 + y*t"


    let node = math.simplify(eq, {
        x: math.parse("ox + dx * t"),
        y: math.parse("oy + dy * t"),
        z: math.parse("oz + dz * t")
    })

    node = math.rationalize(node)
    console.log("Rationalized: " + node.toString())
    //let node = math.parse(eq)

    const zeroDegree = pickWithVariable(node, 0)
    console.log("Zero: " + zeroDegree.toString())
    console.log("Zero: " + math.simplify(zeroDegree).toString())

    const firstDegree = pickWithVariable(node, 1)
    console.log("First: " + firstDegree.toString())
    console.log("First: " + math.simplify(firstDegree).toString())
    
    const secondDegree = pickWithVariable(node, 2)
    console.log("Second: " + secondDegree.toString())
    console.log("Second: " + math.simplify(secondDegree).toString())

    const thirdDegree = pickWithVariable(node, 3)
    console.log("Third: " + thirdDegree.toString())
    console.log("Third: " + math.simplify(thirdDegree).toString())

    const fourthDegree = pickWithVariable(node, 4)
    console.log("Fourth: " + fourthDegree.toString())
    console.log("Fourth: " + math.simplify(fourthDegree).toString())

    console.log(pickWithVariable(node, 1).toString())

    const simplified = math.simplify(pickWithVariable(node, 1))
    console.log(simplified.toString())
    // node = math.rationalize(node)
    console.log(node)
    //node = math.simplify(node, rules)
    console.log(math.derivative(eq, "x").toString())
    console.log(math.derivative(eq, "y").toString())
    console.log(math.derivative(eq, "z").toString())
}