"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"
import { cn } from "cn"

// react-resizable-panels v4 renamed PanelGroup/PanelResizeHandle to
// Group/Separator and dropped the data-panel-group-direction attribute it
// used to stamp on the DOM, so orientation-dependent styling can no longer
// be a CSS selector — it's threaded through context instead, same as
// drawer.tsx's direction.
const ResizableOrientationContext = React.createContext<
  "horizontal" | "vertical"
>("horizontal")

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizableOrientationContext.Provider value={orientation}>
      <ResizablePrimitive.Group
        data-slot="resizable-panel-group"
        orientation={orientation}
        className={cn(
          "flex h-full w-full",
          orientation === "vertical" && "flex-col",
          className
        )}
        {...props}
      />
    </ResizableOrientationContext.Provider>
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) {
  const orientation = React.useContext(ResizableOrientationContext)
  const vertical = orientation === "vertical"

  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex items-center justify-center bg-border after:absolute after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden",
        vertical
          ? "h-px w-full after:left-0 after:h-1 after:w-full after:-translate-y-1/2 after:translate-x-0 [&>div]:rotate-90"
          : "w-px after:inset-y-0 after:left-1/2 after:w-1",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
