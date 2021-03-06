/**
 * UUI Core Component Util
 *
 * this file provides multiple utils for building powerful uui components.
 * Any component built using this tool supports custom styles,
 * which means you can modify className, style and even children of nodes in the component.
 */


import React from 'react';
import { mapValues, pick, isString, omit, merge, clone, uniq, isEmpty, chain } from 'lodash';
import classNames from 'classnames';
import { mergeRefs } from '../utils/mergeRefs';
import { UUICustomizeAriaAttributes } from './types/UUICustomizeAriaAttributes';

// ---------------------------------------------------------------
// Customize Extra Props
// ---------------------------------------------------------------

export interface NodeCustomizeClassNameProps {
  className?: string;
  overrideClassName?: string;
  extendClassName?: string;
}
export interface NodeCustomizeStyleProps {
  style?: React.CSSProperties;
  overrideStyle?: React.CSSProperties;
  extendStyle?: React.CSSProperties;
}
export interface NodeCustomizeChildrenProps {
  children?: React.ReactNode;
  overrideChildren?: React.ReactNode;
  extendChildrenBefore?: React.ReactNode;
  extendChildrenAfter?: React.ReactNode;
}
export interface NodeCustomizeDataAttributesProps {
  dataAttributes?: {
    [key: string]: any;
  };
}
export interface NodeCustomizeAriaAttributesProps {
  ariaAttributes?: UUICustomizeAriaAttributes;
}
export type NodeCustomizeProps =
  & NodeCustomizeClassNameProps
  & NodeCustomizeStyleProps
  & NodeCustomizeChildrenProps
  & NodeCustomizeDataAttributesProps
  & NodeCustomizeAriaAttributesProps
  & React.RefAttributes<any>

// ---------------------------------------------------------------
// Customize Extra Props Helper
// ---------------------------------------------------------------

function getCompiledNodeName(nodeName: string, options: { prefix: string; separator: string; name: string }) {
  return [options.prefix, options.name, nodeName].join(options.separator)
}
function getCompiledClassNames(nodeClassName: string, props: NodeCustomizeClassNameProps): string {
  return props.overrideClassName ? classNames(props.overrideClassName) : classNames(nodeClassName, props.className, props.extendClassName)
}
function getCompiledStyles(props: NodeCustomizeStyleProps): React.CSSProperties {
  return props.overrideStyle ? merge(props.overrideStyle) : merge(props.style, props.extendStyle)
}
function getCompiledChildren(props: NodeCustomizeChildrenProps): JSX.Element | null {
  if (props.overrideChildren) {
    return <>{props.overrideChildren}</>
  } else {
    return <>{props.extendChildrenBefore}{props.children}{props.extendChildrenAfter}</>
  }
}

// ---------------------------------------------------------------
// IntrinsicNode
// ---------------------------------------------------------------

type IntrinsicNodeCustomizeProps = NodeCustomizeProps
type IntrinsicNodeCustomizeOptions = {
  name: string;
  prefix: string;
  separator: string;
}

export type IntrinsicNodeT = JSX.IntrinsicElements
type IntrinsicNode<T extends keyof JSX.IntrinsicElements, N extends string | number | symbol> = (tagName: T, nodeName: N, options: IntrinsicNodeCustomizeOptions) => (props: JSX.IntrinsicElements[T]) => JSX.Element
function IntrinsicNode<T extends keyof JSX.IntrinsicElements, N extends string>(tagName: T, nodeName: N, options: IntrinsicNodeCustomizeOptions) {
  const Node = React.forwardRef((_props: JSX.IntrinsicElements[T], _ref) => {
    const customizeProps = (Node as any)['CustomizeProps'] as { customize?: IntrinsicNodeCustomizeProps } & UUIConvenienceProps
    const className = (() => {
      return getCompiledClassNames(getCompiledNodeName(nodeName, pick(options, 'name', 'prefix', 'separator')), {
        ...pick(customizeProps.customize, ['overrideClassName', 'extendClassName']),
        ...pick(_props, ['className']),
      })
    })()
    const style = (() => {
      const data = getCompiledStyles({
        ...pick(customizeProps.customize, ['overrideStyle', 'extendStyle']),
        ...pick(_props, ['style']),
      })
      return isEmpty(data) ? undefined : data
    })()
    const dataAttributes = (() => {
      if (!customizeProps.customize?.dataAttributes) return {}
      /**
       * @reference https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Name
       * TODO: // fix regex for supporting unicode
       */
      const validDataAttributesCharactersRegex = /^([A-Za-z0-9-])*$/
      return chain(customizeProps.customize.dataAttributes)
        .pickBy((v, k) => validDataAttributesCharactersRegex.test(k))
        .mapKeys((v, k) => `data-${k}`)
        .value()
    })()
    const children = (() => {
      const noChildren = ['input', 'textarea', 'hr'].indexOf(tagName) !== -1
      const isSelectOption = tagName === 'option'
      // input tag do not support to pass children props
      let children: string | React.ReactNode | undefined = undefined
      if (isSelectOption) {
        // select option tag only support string type children,
        // if pass Fragments to children, it will show [Object Object] in html.
        children = _props.children
      } else if (!noChildren) {
        children = getCompiledChildren({
          ...pick(customizeProps.customize, ['overrideChildren', 'extendChildrenBefore', 'extendChildrenAfter'] as const),
          ...pick(_props, ['children']),
        })
      }
      return children
    })()

    const ariaAttributes = (() => {
      if (!customizeProps.customize?.ariaAttributes) return {}
      return chain(customizeProps.customize.ariaAttributes)
        .mapKeys((v, k) => `aria-${k}`)
        .value()
    })()

    /**
     * Merge both customize ref and component inner ref.
     */
    const ref = (() => {
      const refs: any[] = []
      const customizeRef = customizeProps.customize && customizeProps.customize.ref
      if (customizeRef) refs.push(customizeRef)
      if (_ref) refs.push(_ref)
      return mergeRefs(refs)
    })()

    /**
     * Merge both customize functions and component inner onXXX callback functions.
     */
    const mergedCallbackFunctions = (() => {
      const propsObj = _props as any
      const customizeObj = (customizeProps.customize || {}) as any

      const data: any = {}
      const attrs = uniq([
        ...Object.keys(propsObj),
        ...Object.keys(customizeObj),
      ])
      for (const attr of attrs) {
        if (attr.startsWith('on')) {
          const propsObjFunctionExist = !!(propsObj[attr] && typeof propsObj[attr] === 'function')
          const customizeObjFunctionExist = !!(customizeObj[attr] && typeof customizeObj[attr] === 'function')

          data[attr] = (...args: any[]) => {
            if (propsObjFunctionExist) {
              propsObj[attr](...args);
            }
            if (customizeObjFunctionExist) {
              customizeObj[attr](...args);
            }
          };
        }
      }
      return data
    })()

    return React.createElement(tagName, {
      ...omit(_props, 'children', 'ref', 'className', 'style'),
      ...mergedCallbackFunctions,
      ...dataAttributes,
      ...ariaAttributes,
      ref,
      className, style,
    }, children)
  })
  Node.displayName = `<UUI> [IntrinsicNode] ${nodeName}`
  return Node
}

// ---------------------------------------------------------------
// ComponentNode
// ---------------------------------------------------------------

type ComponentNodeCustomizeProps<M extends string | number | symbol> = {
  [key in M]: IntrinsicNodeCustomizeProps
}
type ComponentNodeCustomizeOptions= {
  name: string;
  prefix: string;
  separator: string;
}

export type FunctionComponentNodeT = (props: any, ...args: any) => any
export interface TypeWithArgs<T, A extends any[]> extends Function { new(...args: A): T}
export type ClassComponentNodeT = TypeWithArgs<React.Component<any, any, any>, any>

type ComponentNode<P extends any, N extends string | number | symbol, M extends string | number | symbol> = (Target: React.FunctionComponent<P> | React.ComponentType<P>, nodeName: N, options: ComponentNodeCustomizeOptions) => (props: P) => JSX.Element
function ComponentNode<P extends any, N extends string, M extends string>(Target: React.FunctionComponent<P> | React.ComponentType<P>, nodeName: N, options: ComponentNodeCustomizeOptions) {
  const _Target = Target as any
  const Node = React.forwardRef((_props: P & UUIConvenienceProps, ref) => {
    const customizeProps = (Node as any)['CustomizeProps'] as { customize?: ComponentNodeCustomizeProps<M> }
    const nodeClassName = [options.prefix, options.name, nodeName].join(options.separator)

    if (!customizeProps.customize) customizeProps.customize = {} as any;
    if (!(customizeProps.customize as any)['Root']) (customizeProps.customize as any)['Root'] = {}
    const rootCustomize = (customizeProps.customize as any)['Root']
    rootCustomize.extendClassName = classNames(nodeClassName, rootCustomize.extendClassName)

    return <_Target
      {...omit(_props, 'customize', 'ref')}
      ref={ref}
      className={_props.className}
      customize={customizeProps.customize}
    />
  })
  Node.displayName = `<UUI> [ComponentNode] ${nodeName}`
  return Node
}

// ---------------------------------------------------------------
// Type Helper
// ---------------------------------------------------------------

export type UUIComponentNodes<
  X extends { [key in string]?: keyof IntrinsicNodeT | FunctionComponentNodeT | ClassComponentNodeT },
> = {
  [key in keyof X]: X[key] extends keyof IntrinsicNodeT
    ? ReturnType<IntrinsicNode<X[key], key>>
    : (
      X[key] extends FunctionComponentNodeT | ClassComponentNodeT
      ? X[key]
      : never
    )
}
export type UUIComponentCustomizeProps<
  X extends { [key in string]?: keyof IntrinsicNodeT | FunctionComponentNodeT | ClassComponentNodeT },
> = {
  /**
   * Customize component nodes
   * @default none
   */
  customize?: {
    [key in keyof X]?: X[key] extends keyof IntrinsicNodeT
      ? NodeCustomizeProps & Partial<JSX.IntrinsicElements[X[key]]>
      : (
        X[key] extends FunctionComponentNodeT
        ? NonNullable<Parameters<X[key]>[0]['customize']>
        : (
          X[key] extends ClassComponentNodeT
          ? React.ComponentProps<X[key]>['customize']
          : never
        )
      )
  };
}
export type UUIConvenienceProps = {
  /**
   * Convenience className props,
   * this props will be applied to append to extendClassName of component Root node customize props.
   * @default none
   */
  className?: string;
  /**
   * Convenience style props,
   * this props will be applied to merge to extendStyle of component Root node customize props.
   * @default none
   */
  style?: React.CSSProperties;

  /**
   * React native support data-* attributes type,
   * dont need to redeclare again convenience data attributes.
   */
}
export type UUIComponentProps<P, X extends { [key in string]?: keyof IntrinsicNodeT | FunctionComponentNodeT | ClassComponentNodeT }> = P & UUIConvenienceProps & UUIComponentCustomizeProps<X>
export type UUIFunctionComponentProps<T extends (...args: any) => any> = Parameters<T>[0]
export type UUIClassComponentProps<T extends React.JSXElementConstructor<any>> = React.ComponentProps<T>

// ---------------------------------------------------------------
// UUI Component Util
// ---------------------------------------------------------------

export abstract class UUI {
  /**
   * UUI Advanced Component for Function Component
   * @param options setup options
   * @param WrappedComponent wrapped function component
   */
  static FunctionComponent<
    /**
     * Generic type P for target component props
     */
    P,
    /**
     * Generic type N for component node name
     */
    N extends string,
    /**
     * Generic type T for options.nodes value
     */
    T extends keyof IntrinsicNodeT | FunctionComponentNodeT | ClassComponentNodeT,
    /**
     * Generic type X for WrappedComponent generated nodes
     */
    X extends { [key in N]: T },
    /**
     * Generic type Z for component props.customize
     */
    Z extends UUIComponentCustomizeProps<X>
  >(
    options: {
      prefix?: string;
      name: string;
      separator?: string;
      nodes: X;
    },
    WrappedComponent: (props: P, nodes: UUIComponentNodes<X>) => React.ReactElement,
  ) {
    const finalOptions: Required<typeof options> = getFinalOptions(options)
    const nodes = compileNodes(finalOptions)
    const component: React.FunctionComponent<P & UUIConvenienceProps & Z> = (props) => {
      const compiledProps = compileProps(props, finalOptions, undefined)
      injectCustomizeProps(nodes, compiledProps)
      return WrappedComponent(compiledProps, nodes)
    }
    component.displayName = `<UUI> [Component] ${finalOptions.name}`
    return component
  }

  /**
   * UUI Advanced Component for Class Component
   * @param options setup options
   */
  static ClassComponent<
    /**
     * Generic type N for component node name
     */
    N extends string,
    /**
     * Generic type T for options.nodes value
     */
    T extends keyof IntrinsicNodeT | FunctionComponentNodeT | ClassComponentNodeT,
    /**
     * Generic type X for WrappedComponent generated nodes
     */
    X extends { [key in N]: T },
    /**
     * Generic type Z for component props.customize
     */
    Z extends UUIComponentCustomizeProps<X>
  >(
    options: {
      prefix?: string;
      name: string;
      separator?: string;
      nodes: X;
    },
  ) {
    const finalOptions: Required<typeof options> = getFinalOptions(options)
    const nodes = compileNodes(finalOptions)
    return class WrappedComponent<P = {}, S = {}, SS = any> extends React.Component<P & UUIConvenienceProps & Z, S, SS> {
      nodes: UUIComponentNodes<X>
      displayName: string
      constructor(props: P & UUIConvenienceProps & Z) {
        super(props)
        this.displayName = `<UUI> [Component] ${finalOptions.name}`
        const compiledProps = compileProps(props, finalOptions, (props as any).innerRef || undefined)
        injectCustomizeProps(nodes, compiledProps)
        this.nodes = nodes
      }
    }
  }
}

function getFinalOptions(options: any) {
  return {
    ...options,
    prefix: options.prefix || 'UUI',
    separator: options.separator || '-',
  }
}

function compileProps(props: any, options: any, ref: any): any {
  /**
   * Convenience props: className, style
   * className will be injected into customize.Root { extendClassName: ... }
   * style will be injected into customize.Root { extendStyle: ... }
   */
  const compiledProps = clone(props)
  if (!compiledProps.customize) {
    compiledProps.customize = {}
  }

  // Generally, UUI component should contain a Root node.
  if (
    (options.nodes as any)['Root'] &&
    isString((options.nodes as any)['Root'])
  ) {
    const rootCustomizeProps: any = (compiledProps.customize as any)['Root'] || {};
    if (compiledProps.className) rootCustomizeProps.extendClassName = classNames(compiledProps.className, rootCustomizeProps.extendClassName);
    if (compiledProps.style) rootCustomizeProps.extendStyle = Object.assign(compiledProps.style, rootCustomizeProps.extendStyle);

    const dataAttributes = chain(compiledProps)
      .pickBy((v, k) => k.startsWith('data-'))
      .mapKeys((v, k) => k.replace('data-', ''))
      .value();
    if (!isEmpty(dataAttributes)) {
      rootCustomizeProps.dataAttributes = Object.assign(dataAttributes, rootCustomizeProps.dataAttributes);
    }

    const ariaAttributes = chain(compiledProps)
      .pickBy((v, k) => k.startsWith('aria-'))
      .mapKeys((v, k) => k.replace('aria-', ''))
      .value();
    if (!isEmpty(ariaAttributes)) {
      rootCustomizeProps.ariaAttributes = Object.assign(ariaAttributes, rootCustomizeProps.ariaAttributes);
    }

    (compiledProps.customize as any)['Root'] = rootCustomizeProps;
  }
  compiledProps.ref = ref

  return  compiledProps
}

function compileNodes(options: any): any {
  return mapValues(options.nodes, (nodeElement, nodeName) => {
    if (isString(nodeElement)) {
      return IntrinsicNode(nodeElement as any, nodeName, options)
    } else {
      return ComponentNode(nodeElement as any, nodeName, options)
    }
  })
}

function injectCustomizeProps(nodes: any, props: any) {
  for (const nodeName of Object.keys(nodes)) {
    const customizeProps = props.customize && (props.customize as any)[nodeName]
    nodes[nodeName]['CustomizeProps'] = { customize: customizeProps }
  }
}