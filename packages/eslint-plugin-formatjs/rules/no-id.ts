import {Rule, Scope} from 'eslint'
import {extractMessages} from '../util'
import {TSESTree} from '@typescript-eslint/typescript-estree'

function checkNode(
  context: Rule.RuleContext,
  node: TSESTree.Node,
  importedMacroVars: Scope.Variable[]
) {
  const msgs = extractMessages(node, importedMacroVars)
  for (const [{idPropNode}] of msgs) {
    if (idPropNode) {
      context.report({
        node: idPropNode as any,
        message: 'Manual `id` are not allowed in message descriptor',
        fix(fixer) {
          const src = context.getSourceCode()
          const token = src.getTokenAfter(idPropNode as any)
          const fixes = [fixer.remove(idPropNode as any)]
          if (token?.value === ',') {
            fixes.push(fixer.remove(token))
          }
          return fixes
        },
      })
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ban explicit ID from MessageDescriptor',
      category: 'Errors',
      recommended: false,
      url: 'https://formatjs.io/docs/tooling/linter#no-id',
    },
    fixable: 'code',
  },
  create(context) {
    let importedMacroVars: Scope.Variable[] = []
    const callExpressionVisitor = (node: TSESTree.Node) =>
      checkNode(context, node, importedMacroVars)

    if (context.parserServices.defineTemplateBodyVisitor) {
      return context.parserServices.defineTemplateBodyVisitor(
        {
          CallExpression: callExpressionVisitor,
        },
        {
          CallExpression: callExpressionVisitor,
        }
      )
    }
    return {
      ImportDeclaration: node => {
        const moduleName = node.source.value
        if (moduleName === 'react-intl') {
          importedMacroVars = context.getDeclaredVariables(node)
        }
      },
      JSXOpeningElement: (node: TSESTree.Node) =>
        checkNode(context, node, importedMacroVars),
      CallExpression: callExpressionVisitor,
    }
  },
} as Rule.RuleModule
