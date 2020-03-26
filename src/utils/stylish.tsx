import React from 'react';
import classnames from 'classnames';
import { NodeExtraClassNames, getCompiledClassNames, ExtraClassNameProps } from './extraClassName';
import { NodeExtraStyles, getCompiledStyles, ExtraStyleProps } from './extraStyle';
import { getCompiledChildren, NodeExtraChildren, ExtraChildrenProps } from './extraChildren';
import { pick, merge, mergeWith, omit, clone } from 'lodash';
import classNames from 'classnames';

export type StylishProps<T extends string> = ExtraClassNameProps<T> & ExtraStyleProps<T> & ExtraChildrenProps<T>

function compileNodeName(nodeNames: (string | undefined)[], options?: {
  prefix?: string,
  separator?: string,
}) {
  return [options?.prefix, ...nodeNames].filter((i) => i && i.length > 0).join(options?.separator || '-')
}

export function initStylish<T extends string>(
  rootNodeName: string,
  props?: {
    overrideClassName?: NodeExtraClassNames<T>,
    extendClassName?: NodeExtraClassNames<T>,

    overrideStyle?: NodeExtraStyles<T>,
    extendStyle?: NodeExtraStyles<T>,

    overrideChildren?: NodeExtraChildren<T>,
    extendChildrenBefore?: NodeExtraChildren<T>,
    extendChildrenAfter?: NodeExtraChildren<T>,
  },
  options?: {
    prefix?: string,
    separator?: string,
  }
) {
  return (
    nodeName: string,
    classNames: (string | undefined)[] = [],
    style: React.CSSProperties = {},
    children?: React.ReactNode,
  ) => {
    return {
      className: getCompiledClassNames<T>(nodeName, compileNodeName([rootNodeName, nodeName], options), classnames(classNames), props),
      style: getCompiledStyles<T>(nodeName, style, props),
      children: getCompiledChildren<T>(nodeName, children, props),
    }
  }
}

export function initStylished<T extends string>(
  rootNodeName: string,
  props?: {
    overrideClassName?: NodeExtraClassNames<T>,
    extendClassName?: NodeExtraClassNames<T>,

    overrideStyle?: NodeExtraStyles<T>,
    extendStyle?: NodeExtraStyles<T>,

    overrideChildren?: NodeExtraChildren<T>,
    extendChildrenBefore?: NodeExtraChildren<T>,
    extendChildrenAfter?: NodeExtraChildren<T>,
  },
  options?: {
    prefix?: string,
    separator?: string,
  }
) {

  return {
    element: <T extends keyof JSX.IntrinsicElements>(tagName: T, nodeName: string) => {
      const Tag = tagName as any
      const isInput = ['input'].indexOf(tagName) !== -1
      const isSelectOption = tagName === 'option'

      return React.forwardRef((_props: JSX.IntrinsicElements[T], ref) => {
        // input tag do not support to pass children props
        let children: string | React.ReactNode | undefined = undefined
        if (isSelectOption) {
          // select option tag only support string type children,
          // if pass Fragments to children, it will show [Object Object] in html.
          children = _props.children
        } else if (!isInput) {
          children = getCompiledChildren<T>(nodeName, _props.children, props as any)
        }

        return (
          <Tag
            {...omit(_props, [
              'overrideClassName', 'extendClassName',
              'overrideStyle', 'extendStyle',
              'overrideChildren', 'extendChildrenBefore', 'extendChildrenAfter',
            ])}
            ref={ref}
            className={getCompiledClassNames<T>(nodeName, compileNodeName([rootNodeName, nodeName], options), _props.className, props as any)}
            style={getCompiledStyles<T>(nodeName, _props.style, props as any)}
            children={children}
          />
        )
      })
    },
    component: <P extends any>(Target: React.ComponentType<P>, nodeName: string) => {
      return React.forwardRef((_props: P, ref) => {
        return (
          <Target
            {...omit(_props, [
              'overrideClassName', 'extendClassName',
              'overrideStyle', 'extendStyle',
              'overrideChildren', 'extendChildrenBefore', 'extendChildrenAfter',
            ]) as any}
            ref={ref}
            className={getCompiledClassNames<T>(nodeName, compileNodeName([rootNodeName, nodeName], options), _props.className, props)}
            style={getCompiledStyles<T>(nodeName, _props.style, props)}
            children={getCompiledChildren<T>(nodeName, _props.children, props)}
          />
        )
      })
    },
  }
}

export function initStylishedProxy<T extends string, P extends StylishProps<T>>(Target: React.ComponentType<P>, props: P) {
  const getMergedStylishProps = (_props: P, props: P) => {
    const classNameKeys = ['overrideClassName', 'extendClassName'] as const
    const styleKeys = ['overrideStyle', 'extendStyle'] as const
    const childrenKeys = ['overrideChildren', 'extendChildrenBefore', 'extendChildrenAfter'] as const

    let finalProps = clone(_props)

    for (const key of classNameKeys) {
      if (props[key]) {
        if (key === 'overrideClassName') {
          finalProps[key] = merge(finalProps[key], props[key])
        } else if (key === 'extendClassName') {
          finalProps[key] = mergeWith(finalProps[key], props[key], (obj: string, src: string) => classNames([obj, src]))
        }
      }
    }
    for (const key of styleKeys) {
      if (props[key]) {
        if (key === 'overrideStyle') {
          finalProps[key] = mergeWith(finalProps[key], props[key], (obj, src) => src)
        } else if (key === 'extendStyle') {
          finalProps[key] = merge(finalProps[key], props[key])
        }
      }
    }
    for (const key of childrenKeys) {
      if (props[key]) {
        if (key === 'overrideChildren') {
          finalProps[key] = mergeWith(finalProps[key], props[key], (obj, src) => src)
        } else if (key === 'extendChildrenBefore') {
          finalProps[key] = mergeWith(finalProps[key], props[key], (obj: React.ReactNode, src: React.ReactNode) => <>{src}{obj}</>)
        } else if (key === 'extendChildrenAfter') {
          finalProps[key] = mergeWith(finalProps[key], props[key], (obj: React.ReactNode, src: React.ReactNode) => <>{obj}{src}</>)
        }
      }
    }

    if (props['prefixClassName']) {
      finalProps['prefixClassName'] = props['prefixClassName']
    }

    return finalProps
  }

  return (_props: P) => {
    return (
      <Target
        {...getMergedStylishProps(_props, props)}
      />
    )
  }
}