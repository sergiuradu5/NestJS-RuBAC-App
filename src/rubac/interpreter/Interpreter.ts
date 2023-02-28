import { Injectable } from '@nestjs/common';
import { AstNode } from '../parser/Parser';

/**
 * Callback map
 */

type CallbackMapWithNodeProp = {
  Node: (node: AstNode, parent?: AstNode, key?: string, index?: number) => any;
};

type CallbackMap =
  | {
      [nodeType: string]: (
        node: AstNode,
        parent?: AstNode,
        key?: string,
        index?: number,
      ) => any;
    }
  | CallbackMapWithNodeProp;

type StringKeysObj = {
  [name: string]: any;
}

/**
 * ExecutionEnvironment will contain all variables and functions needed for AST evaluation
 */
export interface ExecutionEnvironment {
  vars: StringKeysObj
  predefIdent: StringKeysObj
}

/**
 * Interpreter of the AST
 */
@Injectable()
export class Interpreter {
  visit(ast: AstNode, callbackMap: CallbackMap) {
    const _visit = (node, parent, key?, index?) => {
      const nodeType = this.getNodeType(node);

      // Node() from callback map will execute on every node
      if (callbackMap.Node) {
        callbackMap.Node(node, parent, key, index);
      }

      if (nodeType in callbackMap) {
        callbackMap[nodeType](node, parent, key, index);
      }

      const keys = Object.keys(node);
      for (let i = 0; i < keys.length; i++) {
        const child = node[keys[i]];
        if (Array.isArray(child)) {
          for (let j = 0; j < child.length; j++) {
            _visit(child[j], node, keys[i], j);
          }
        } else if (this.isNode(child)) {
          _visit(child, node, keys[i]);
        }
      }
    };
    _visit(ast, null);
  }

  evaluate(node: AstNode, environment: ExecutionEnvironment) {
    return node.evaluate(environment);
  }

  private getNodeType(node: AstNode) {
    return node.type;
  }

  private isNode(node?) {
    // probably need more check,
    // for example,
    // if the node contains certain properties
    return typeof node === 'object' && !Array.isArray(node);
  }
}
