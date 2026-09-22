"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "cn"

// Ported from a vaul-based drawer — vaul isn't installed and @base-ui/react
// already ships a native, swipeable Drawer, so this rebuilds the same shape
// on that instead of adding a second drawer dependency. vaul's `direction`
// (which edge the drawer is anchored to) maps directly to Base UI's
// `swipeDirection` (which way a swipe dismisses it) — a bottom sheet is
// dismissed by swiping down, and so on.
type DrawerDirection = "top" | "bottom" | "left" | "right"

const DrawerDirectionContext = React.createContext<DrawerDirection>("bottom")

const SWIPE_DIRECTION: Record<DrawerDirection, "up" | "down" | "left" | "right"> = {
  top: "up",
  bottom: "down",
  left: "left",
  right: "right",
}

function Drawer({
  direction = "bottom",
  ...props
}: DrawerPrimitive.Root.Props & { direction?: DrawerDirection }) {
  return (
    <DrawerDirectionContext.Provider value={direction}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        swipeDirection={SWIPE_DIRECTION[direction]}
        {...props}
      />
    </DrawerDirectionContext.Provider>
  )
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const DIRECTION_CLASSES: Record<DrawerDirection, string> = {
  top: "inset-x-0 top-0 mb-24 max-h-[80vh] rounded-b-lg border-b",
  bottom: "inset-x-0 bottom-0 mt-24 max-h-[80vh] rounded-t-lg border-t",
  right: "inset-y-0 right-0 w-3/4 border-l sm:max-w-sm",
  left: "inset-y-0 left-0 w-3/4 border-r sm:max-w-sm",
}

function DrawerContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props) {
  const direction = React.useContext(DrawerDirectionContext)

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Popup
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-background",
          DIRECTION_CLASSES[direction],
          className
        )}
        {...props}
      >
        {direction === "bottom" && (
          <div className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted" />
        )}
        {children}
      </DrawerPrimitive.Popup>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  const direction = React.useContext(DrawerDirectionContext)
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 md:gap-1.5 md:text-left",
        (direction === "bottom" || direction === "top") && "text-center",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
