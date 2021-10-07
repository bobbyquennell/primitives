import * as React from 'react';
import { composeEventHandlers } from '@radix-ui/primitive';
import { createContextScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { createPopperScope } from '@radix-ui/react-popper';
import { Portal } from '@radix-ui/react-portal';
import { Presence } from '@radix-ui/react-presence';
import { Primitive } from '@radix-ui/react-primitive';

import type * as Radix from '@radix-ui/react-primitive';
import type { Scope } from '@radix-ui/react-context';

/* -------------------------------------------------------------------------------------------------
 * HoverCard
 * -----------------------------------------------------------------------------------------------*/

const HOVERCARD_NAME = 'HoverCard';

type ScopeProps<P> = P & { __scopeHoverCard?: Scope };
const [createHoverCardContext, createHoverCardScope] = createContextScope(HOVERCARD_NAME, [
  createPopperScope,
]);
const usePopperScope = createPopperScope();

type HoverCardContextValue = {
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpen(): void;
  onClose(): void;
};

const [HoverCardProvider, useHoverCardContext] =
  createHoverCardContext<HoverCardContextValue>(HOVERCARD_NAME);

interface HoverCardProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  children?: React.ReactNode;
}

const HoverCard: React.FC<HoverCardProps> = (props: ScopeProps<HoverCardProps>) => {
  const {
    __scopeHoverCard,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    openDelay = 700,
    closeDelay = 300,
  } = props;
  const popperScope = usePopperScope(__scopeHoverCard);
  const openTimerRef = React.useRef(0);
  const closeTimerRef = React.useRef(0);

  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const handleOpen = React.useCallback(() => {
    clearTimeout(closeTimerRef.current);
    openTimerRef.current = window.setTimeout(() => setOpen(true), openDelay);
  }, [openDelay, setOpen]);

  const handleClose = React.useCallback(() => {
    clearTimeout(openTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), closeDelay);
  }, [closeDelay, setOpen]);

  // cleanup any queued state updates on unmount
  React.useEffect(() => {
    return () => {
      clearTimeout(openTimerRef.current);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <HoverCardProvider
      scope={__scopeHoverCard}
      open={open}
      onOpenChange={setOpen}
      onOpen={handleOpen}
      onClose={handleClose}
    >
      <PopperPrimitive.Root {...popperScope}>{children}</PopperPrimitive.Root>
    </HoverCardProvider>
  );
};

HoverCard.displayName = HOVERCARD_NAME;

/* -------------------------------------------------------------------------------------------------
 * HoverCardTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'HoverCardTrigger';

type HoverCardTriggerElement = React.ElementRef<typeof Primitive.a>;
type PrimitiveLinkProps = Radix.ComponentPropsWithoutRef<typeof Primitive.a>;
interface HoverCardTriggerProps extends PrimitiveLinkProps {}

const HoverCardTrigger = React.forwardRef<HoverCardTriggerElement, HoverCardTriggerProps>(
  (props: ScopeProps<HoverCardTriggerProps>, forwardedRef) => {
    const { __scopeHoverCard, ...triggerProps } = props;
    const context = useHoverCardContext(TRIGGER_NAME, __scopeHoverCard);
    const popperScope = usePopperScope(__scopeHoverCard);
    return (
      <PopperPrimitive.Anchor asChild {...popperScope}>
        <Primitive.a
          data-state={context.open ? 'open' : 'closed'}
          {...triggerProps}
          ref={forwardedRef}
          onPointerEnter={composeEventHandlers(props.onPointerEnter, excludeTouch(context.onOpen))}
          onPointerLeave={composeEventHandlers(props.onPointerLeave, excludeTouch(context.onClose))}
        />
      </PopperPrimitive.Anchor>
    );
  }
);

HoverCardTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * HoverCardContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'HoverCardContent';

type HoverCardContentElement = HoverCardContentImplElement;
interface HoverCardContentProps extends HoverCardContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true;
}

const HoverCardContent = React.forwardRef<HoverCardContentElement, HoverCardContentProps>(
  (props: ScopeProps<HoverCardContentProps>, forwardedRef) => {
    const { forceMount, ...contentProps } = props;
    const context = useHoverCardContext(CONTENT_NAME, props.__scopeHoverCard);
    return (
      <Presence present={forceMount || context.open}>
        <HoverCardContentImpl
          data-state={context.open ? 'open' : 'closed'}
          {...contentProps}
          onPointerEnter={composeEventHandlers(props.onMouseEnter, excludeTouch(context.onOpen))}
          onPointerLeave={composeEventHandlers(props.onMouseLeave, excludeTouch(context.onClose))}
          ref={forwardedRef}
        />
      </Presence>
    );
  }
);

HoverCardContent.displayName = CONTENT_NAME;

/* ---------------------------------------------------------------------------------------------- */

type HoverCardContentImplElement = React.ElementRef<typeof PopperPrimitive.Content>;
type PopperContentProps = Radix.ComponentPropsWithoutRef<typeof PopperPrimitive.Content>;
interface HoverCardContentImplProps extends PopperContentProps {
  /**
   * Whether the `HoverCard` should render in a `Portal`
   * (default: `true`)
   */
  portalled?: boolean;
}

const HoverCardContentImpl = React.forwardRef<
  HoverCardContentImplElement,
  HoverCardContentImplProps
>((props: ScopeProps<HoverCardContentImplProps>, forwardedRef) => {
  const { __scopeHoverCard, portalled = true, ...contentProps } = props;
  const popperScope = usePopperScope(__scopeHoverCard);
  const PortalWrapper = portalled ? Portal : React.Fragment;
  return (
    <PortalWrapper>
      <PopperPrimitive.Content
        {...popperScope}
        {...contentProps}
        ref={forwardedRef}
        style={{
          ...contentProps.style,
          // re-namespace exposed content custom property
          ['--radix-hover-card-content-transform-origin' as any]:
            'var(--radix-popper-transform-origin)',
        }}
      />
    </PortalWrapper>
  );
});

/* -------------------------------------------------------------------------------------------------
 * HoverCardArrow
 * -----------------------------------------------------------------------------------------------*/

const ARROW_NAME = 'HoverCardArrow';

type HoverCardArrowElement = React.ElementRef<typeof PopperPrimitive.Arrow>;
type PopperArrowProps = Radix.ComponentPropsWithoutRef<typeof PopperPrimitive.Arrow>;
interface HoverCardArrowProps extends PopperArrowProps {}

const HoverCardArrow = React.forwardRef<HoverCardArrowElement, HoverCardArrowProps>(
  (props: ScopeProps<HoverCardArrowProps>, forwardedRef) => {
    const { __scopeHoverCard, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeHoverCard);
    return <PopperPrimitive.Arrow {...popperScope} {...arrowProps} ref={forwardedRef} />;
  }
);

HoverCardArrow.displayName = ARROW_NAME;

/* -----------------------------------------------------------------------------------------------*/

function excludeTouch<E>(eventHandler: () => void) {
  return (event: React.PointerEvent<E>) =>
    event.pointerType === 'touch' ? undefined : eventHandler();
}

const Root = HoverCard;
const Trigger = HoverCardTrigger;
const Content = HoverCardContent;
const Arrow = HoverCardArrow;

export {
  createHoverCardScope,
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  HoverCardArrow,
  //
  Root,
  Trigger,
  Content,
  Arrow,
};
export type { HoverCardProps, HoverCardTriggerProps, HoverCardContentProps, HoverCardArrowProps };
