import React, { useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { UUI } from '../../core/uui';
import classNames from 'classnames';
import { useClickAway, useLockBodyScroll } from 'react-use';
import ReactHelper from '../../utils/ReactHelper';

export type DrawerPlacement = 'top' | 'right' | 'bottom' | 'left'

export interface DrawerFeatureProps {
    /**
   * Whether this Drawer show content.
   */
  active: boolean;
  /**
   * Callback invoked when user click outside of content view.
   */
  onDismiss?: () => void;
  /**
   * The content elements of Drawer
   */
  children: React.ReactNode;
  /**
   * Whether the content of Drawer should be rendered inside a `Portal` where appending inside `portalContainer`(if it provided) or `document.body`.
   * @default true
   */
  usePortal?: boolean;
  /**
   * The container element into which the overlay renders its contents, when `usePortal` is `true`.
   * This prop is ignored if `usePortal` is `false`.
   * @default document.body
   */
  portalContainer?: HTMLElement;
  /**
   * Whether lock scrolling on the body element while Drawer is active
   */
  lockBodyScroll?: boolean;
  /**
   * The position at which the Drawer should appear.
   * @default right
   */
  placement?: DrawerPlacement;
}

export const Drawer = UUI.FunctionComponent({
  name: 'Drawer',
  nodes: {
    Root: 'div',
    Portal: 'div',
    Backdrop: 'div',
    Content: 'div',
  }
}, (props: DrawerFeatureProps, nodes) => {
  const { Root, Portal, Backdrop, Content } = nodes

  /**
   * handle optional props default value
   */
  const finalProps = {
    usePortal: props.usePortal === undefined ? true : props.usePortal,
    portalContainer: props.portalContainer || ReactHelper.document?.body,
    lockBodyScroll: props.lockBodyScroll === undefined ? true : props.lockBodyScroll,
    placement: props.placement || 'right',
  }

  const contentRef = useRef<any>(null)
  useClickAway(contentRef, () => {
    props.active && props.onDismiss && props.onDismiss()
  })

  useLockBodyScroll(props.active && finalProps.lockBodyScroll)

  const content = useMemo(() => {
    return (
      <Backdrop className={classNames({ 'STATE_active': props.active }, [`PLACEMENT_${finalProps.placement}`])}>
        <Content ref={contentRef}>{props.children}</Content>
      </Backdrop>
    )
  }, [props.children, props.active, finalProps.placement])

  const portal = useMemo(() => {
    return (finalProps.usePortal && finalProps.portalContainer)
    ? ReactDOM.createPortal(<Portal>{content}</Portal>, finalProps.portalContainer)
    : <Portal>{content}</Portal>
  }, [finalProps.usePortal, finalProps.portalContainer, content])

  return (
    <Root role="dialog">
      {portal}
    </Root>
  )
})

export type DrawerProps = Parameters<typeof Drawer>[0]
