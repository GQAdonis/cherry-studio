/**
 * React Browser Template
 *
 * Shared template for rendering React artifacts in an external browser.
 * Uses esm.sh for ES modules and includes all shadcn/ui components globally.
 */

/**
 * Transform React code imports to use esm.sh for browser compatibility
 */
export function transformReactImports(code: string): string {
  return (
    code
      // Remove @/ path alias imports (shadcn style) - we provide these globally
      .replace(/import\s+\{[^}]+\}\s*from\s*['"]@\/[^'"]*['"]\s*;?\n?/g, '// @/ import handled globally\n')
      .replace(/import\s+\w+\s+from\s*['"]@\/[^'"]*['"]\s*;?\n?/g, '// @/ import handled globally\n')
      // Handle named imports: import { X, Y } from 'package'
      .replace(
        /import\s*\{([^}]+)\}\s*from\s*['"]([^'"@./][^'"]*)['"]/g,
        (_, imports, pkg) => `import { ${imports} } from 'https://esm.sh/${pkg}?external=react'`
      )
      // Handle default imports: import X from 'package'
      .replace(
        /import\s+(\w+)\s+from\s*['"]([^'"@./][^'"]*)['"]/g,
        (_, name, pkg) => `import ${name} from 'https://esm.sh/${pkg}?external=react'`
      )
      // Handle namespace imports: import * as X from 'package'
      .replace(
        /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"@./][^'"]*)['"]/g,
        (_, name, pkg) => `import * as ${name} from 'https://esm.sh/${pkg}?external=react'`
      )
      // Handle scoped packages: import X from '@scope/package'
      .replace(
        /import\s*\{([^}]+)\}\s*from\s*['"](@[^'"]+)['"]/g,
        (_, imports, pkg) => `import { ${imports} } from 'https://esm.sh/${pkg}?external=react'`
      )
      .replace(
        /import\s+(\w+)\s+from\s*['"](@[^'"]+)['"]/g,
        (_, name, pkg) => `import ${name} from 'https://esm.sh/${pkg}?external=react'`
      )
      // Remove relative imports (they won't work anyway)
      .replace(/import\s+.*from\s*['"][./].*['"]\s*;?\n?/g, '// Relative import removed\n')
  )
}

/**
 * Get shadcn/ui CSS variables for theming
 */
export function getShadcnCssVariables(): string {
  return `
    @layer base {
      :root {
        --background: 0 0% 100%;
        --foreground: 240 10% 3.9%;
        --card: 0 0% 100%;
        --card-foreground: 240 10% 3.9%;
        --popover: 0 0% 100%;
        --popover-foreground: 240 10% 3.9%;
        --primary: 240 5.9% 10%;
        --primary-foreground: 0 0% 98%;
        --secondary: 240 4.8% 95.9%;
        --secondary-foreground: 240 5.9% 10%;
        --muted: 240 4.8% 95.9%;
        --muted-foreground: 240 3.8% 46.1%;
        --accent: 240 4.8% 95.9%;
        --accent-foreground: 240 5.9% 10%;
        --destructive: 0 84.2% 60.2%;
        --destructive-foreground: 0 0% 98%;
        --border: 240 5.9% 90%;
        --input: 240 5.9% 90%;
        --ring: 240 5.9% 10%;
        --radius: 0.5rem;
        --sidebar-background: 0 0% 98%;
        --sidebar-foreground: 240 5.3% 26.1%;
        --sidebar-primary: 240 5.9% 10%;
        --sidebar-primary-foreground: 0 0% 98%;
        --sidebar-accent: 240 4.8% 95.9%;
        --sidebar-accent-foreground: 240 5.9% 10%;
        --sidebar-border: 220 13% 91%;
        --sidebar-ring: 240 5.9% 10%;
      }
      .dark {
        --background: 240 10% 3.9%;
        --foreground: 0 0% 98%;
        --card: 240 10% 3.9%;
        --card-foreground: 0 0% 98%;
        --popover: 240 10% 3.9%;
        --popover-foreground: 0 0% 98%;
        --primary: 0 0% 98%;
        --primary-foreground: 240 5.9% 10%;
        --secondary: 240 3.7% 15.9%;
        --secondary-foreground: 0 0% 98%;
        --muted: 240 3.7% 15.9%;
        --muted-foreground: 240 5% 64.9%;
        --accent: 240 3.7% 15.9%;
        --accent-foreground: 0 0% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 0 0% 98%;
        --border: 240 3.7% 15.9%;
        --input: 240 3.7% 15.9%;
        --ring: 240 4.9% 83.9%;
        --sidebar-background: 240 5.9% 10%;
        --sidebar-foreground: 240 4.8% 95.9%;
        --sidebar-primary: 224.3 76.3% 48%;
        --sidebar-primary-foreground: 0 0% 100%;
        --sidebar-accent: 240 3.7% 15.9%;
        --sidebar-accent-foreground: 240 4.8% 95.9%;
        --sidebar-border: 240 3.7% 15.9%;
        --sidebar-ring: 240 4.9% 83.9%;
      }
    }
    * { border-color: hsl(var(--border)); }
    body { background-color: hsl(var(--background)); color: hsl(var(--foreground)); font-family: system-ui, sans-serif; margin: 0; }
    #root { min-height: 100vh; }
  `
}

/**
 * Get Tailwind config for shadcn/ui colors
 */
export function getTailwindConfig(): string {
  return `
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            border: "hsl(var(--border))",
            input: "hsl(var(--input))",
            ring: "hsl(var(--ring))",
            background: "hsl(var(--background))",
            foreground: "hsl(var(--foreground))",
            primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
            secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
            destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
            muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
            accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
            popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
            card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
            sidebar: { DEFAULT: "hsl(var(--sidebar-background))", foreground: "hsl(var(--sidebar-foreground))", primary: "hsl(var(--sidebar-primary))", "primary-foreground": "hsl(var(--sidebar-primary-foreground))", accent: "hsl(var(--sidebar-accent))", "accent-foreground": "hsl(var(--sidebar-accent-foreground))", border: "hsl(var(--sidebar-border))", ring: "hsl(var(--sidebar-ring))" },
          },
          borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
        },
      },
    }
  `
}

/**
 * Get the shadcn/ui components script that loads via esm.sh
 * All components are made available globally on the window object
 */
export function getShadcnComponentsScript(): string {
  return `
// Core React
import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext, forwardRef, Children, cloneElement, Fragment } from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18/client';

// Utility libraries
import { clsx } from 'https://esm.sh/clsx@2?external=react';
import { twMerge } from 'https://esm.sh/tailwind-merge@2?external=react';
import { cva } from 'https://esm.sh/class-variance-authority@0.7?external=react';
import { Slot } from 'https://esm.sh/@radix-ui/react-slot@1?external=react';

// cn utility
const cn = (...inputs) => twMerge(clsx(inputs));

// Lucide Icons
import * as LucideIcons from 'https://esm.sh/lucide-react@0.460?external=react';
const { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Check, X, Search, Circle, Dot, GripVertical, MoreHorizontal, ArrowLeft, ArrowRight, PanelLeft, Menu, Home, Settings, User, Mail, Calendar, FileText, Folder, Image, Video, Music, Download, Upload, Trash, Edit, Plus, Minus, Copy, Share, Heart, Star, Bell, Clock, MapPin, Phone, Globe, Lock, Unlock, Eye, EyeOff, Sun, Moon, Loader2, AlertCircle, Info, HelpCircle, ExternalLink, Link, Bookmark, Tag, Filter, SortAsc, SortDesc, LayoutGrid, List, Columns, Rows, Maximize, Minimize, RefreshCw, RotateCw, ZoomIn, ZoomOut, Move, Crop, Layers, Box, Package, Database, Server, Cloud, Wifi, Bluetooth, Battery, Power, Terminal, Code, GitBranch, Github, Twitter, Facebook, Instagram, Linkedin, Youtube, Slack, MessageSquare, Send, Inbox, Archive, Flag, Award, Trophy, Target, Zap, Flame, Sparkles, Wand, Palette, Brush, Pencil, Eraser, Scissors, Paperclip, Pin, Lightbulb, Key, Shield, AlertTriangle, Ban, CheckCircle, XCircle, MinusCircle, PlusCircle, ArrowUp, ArrowDown, ChevronsLeft, ChevronsRight, ChevronsUp, ChevronsDown, CornerDownLeft, CornerDownRight, CornerUpLeft, CornerUpRight, LogIn, LogOut, UserPlus, UserMinus, Users, Building, Briefcase, CreditCard, DollarSign, ShoppingCart, ShoppingBag, Gift, Percent, Receipt, Truck, Ship, Plane, Car, Bike, Train, Bus, Footprints, Compass, Map, Navigation, Crosshair, Anchor, Umbrella, Thermometer, Wind, Droplet, Snowflake, CloudRain, CloudSnow, CloudLightning, Sunrise, Sunset, MoonStar, Stars } = LucideIcons;

// Radix UI Primitives
import * as AccordionPrimitive from 'https://esm.sh/@radix-ui/react-accordion@1?external=react';
import * as AlertDialogPrimitive from 'https://esm.sh/@radix-ui/react-alert-dialog@1?external=react';
import * as AspectRatioPrimitive from 'https://esm.sh/@radix-ui/react-aspect-ratio@1?external=react';
import * as AvatarPrimitive from 'https://esm.sh/@radix-ui/react-avatar@1?external=react';
import * as CheckboxPrimitive from 'https://esm.sh/@radix-ui/react-checkbox@1?external=react';
import * as CollapsiblePrimitive from 'https://esm.sh/@radix-ui/react-collapsible@1?external=react';
import * as ContextMenuPrimitive from 'https://esm.sh/@radix-ui/react-context-menu@2?external=react';
import * as DialogPrimitive from 'https://esm.sh/@radix-ui/react-dialog@1?external=react';
import * as DropdownMenuPrimitive from 'https://esm.sh/@radix-ui/react-dropdown-menu@2?external=react';
import * as HoverCardPrimitive from 'https://esm.sh/@radix-ui/react-hover-card@1?external=react';
import * as LabelPrimitive from 'https://esm.sh/@radix-ui/react-label@2?external=react';
import * as MenubarPrimitive from 'https://esm.sh/@radix-ui/react-menubar@1?external=react';
import * as NavigationMenuPrimitive from 'https://esm.sh/@radix-ui/react-navigation-menu@1?external=react';
import * as PopoverPrimitive from 'https://esm.sh/@radix-ui/react-popover@1?external=react';
import * as ProgressPrimitive from 'https://esm.sh/@radix-ui/react-progress@1?external=react';
import * as RadioGroupPrimitive from 'https://esm.sh/@radix-ui/react-radio-group@1?external=react';
import * as ScrollAreaPrimitive from 'https://esm.sh/@radix-ui/react-scroll-area@1?external=react';
import * as SelectPrimitive from 'https://esm.sh/@radix-ui/react-select@2?external=react';
import * as SeparatorPrimitive from 'https://esm.sh/@radix-ui/react-separator@1?external=react';
import * as SliderPrimitive from 'https://esm.sh/@radix-ui/react-slider@1?external=react';
import * as SwitchPrimitive from 'https://esm.sh/@radix-ui/react-switch@1?external=react';
import * as TabsPrimitive from 'https://esm.sh/@radix-ui/react-tabs@1?external=react';
import * as ToastPrimitive from 'https://esm.sh/@radix-ui/react-toast@1?external=react';
import * as TogglePrimitive from 'https://esm.sh/@radix-ui/react-toggle@1?external=react';
import * as ToggleGroupPrimitive from 'https://esm.sh/@radix-ui/react-toggle-group@1?external=react';
import * as TooltipPrimitive from 'https://esm.sh/@radix-ui/react-tooltip@1?external=react';
import { useControllableState } from 'https://esm.sh/@radix-ui/react-use-controllable-state@1?external=react';

// ============ SHADCN/UI COMPONENTS ============

// Button
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return React.createElement(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
});
Button.displayName = "Button";

// Input
const Input = forwardRef(({ className, type, ...props }, ref) => {
  return React.createElement("input", {
    type,
    className: cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
    ref,
    ...props
  });
});
Input.displayName = "Input";

// Label
const Label = forwardRef(({ className, ...props }, ref) =>
  React.createElement(LabelPrimitive.Root, { ref, className: cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className), ...props })
);
Label.displayName = "Label";

// Card
const Card = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, className: cn("rounded-lg border bg-card text-card-foreground shadow-sm", className), ...props })
);
const CardHeader = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, className: cn("flex flex-col space-y-1.5 p-6", className), ...props })
);
const CardTitle = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, className: cn("text-2xl font-semibold leading-none tracking-tight", className), ...props })
);
const CardDescription = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, className: cn("text-sm text-muted-foreground", className), ...props })
);
const CardContent = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, className: cn("p-6 pt-0", className), ...props })
);
const CardFooter = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, className: cn("flex items-center p-6 pt-0", className), ...props })
);

// Badge
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
const Badge = ({ className, variant, ...props }) =>
  React.createElement("div", { className: cn(badgeVariants({ variant }), className), ...props });

// Separator
const Separator = forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) =>
  React.createElement(SeparatorPrimitive.Root, {
    ref,
    decorative,
    orientation,
    className: cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className),
    ...props
  })
);
Separator.displayName = "Separator";

// ScrollArea
const ScrollArea = forwardRef(({ className, children, ...props }, ref) =>
  React.createElement(ScrollAreaPrimitive.Root, { ref, className: cn("relative overflow-hidden", className), ...props },
    React.createElement(ScrollAreaPrimitive.Viewport, { className: "h-full w-full rounded-[inherit]" }, children),
    React.createElement(ScrollBar),
    React.createElement(ScrollAreaPrimitive.Corner)
  )
);
const ScrollBar = forwardRef(({ className, orientation = "vertical", ...props }, ref) =>
  React.createElement(ScrollAreaPrimitive.ScrollAreaScrollbar, {
    ref,
    orientation,
    className: cn("flex touch-none select-none transition-colors", orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]", orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]", className),
    ...props
  },
    React.createElement(ScrollAreaPrimitive.ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border" })
  )
);

// Avatar
const Avatar = forwardRef(({ className, ...props }, ref) =>
  React.createElement(AvatarPrimitive.Root, { ref, className: cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className), ...props })
);
const AvatarImage = forwardRef(({ className, ...props }, ref) =>
  React.createElement(AvatarPrimitive.Image, { ref, className: cn("aspect-square h-full w-full", className), ...props })
);
const AvatarFallback = forwardRef(({ className, ...props }, ref) =>
  React.createElement(AvatarPrimitive.Fallback, { ref, className: cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className), ...props })
);

// Tooltip
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = forwardRef(({ className, sideOffset = 4, ...props }, ref) =>
  React.createElement(TooltipPrimitive.Portal, null,
    React.createElement(TooltipPrimitive.Content, {
      ref,
      sideOffset,
      className: cn("z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95", className),
      ...props
    })
  )
);

// DropdownMenu
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuContent = forwardRef(({ className, sideOffset = 4, ...props }, ref) =>
  React.createElement(DropdownMenuPrimitive.Portal, null,
    React.createElement(DropdownMenuPrimitive.Content, {
      ref,
      sideOffset,
      className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className),
      ...props
    })
  )
);
const DropdownMenuItem = forwardRef(({ className, inset, ...props }, ref) =>
  React.createElement(DropdownMenuPrimitive.Item, {
    ref,
    className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0", inset && "pl-8", className),
    ...props
  })
);
const DropdownMenuSeparator = forwardRef(({ className, ...props }, ref) =>
  React.createElement(DropdownMenuPrimitive.Separator, { ref, className: cn("-mx-1 my-1 h-px bg-muted", className), ...props })
);
const DropdownMenuLabel = forwardRef(({ className, inset, ...props }, ref) =>
  React.createElement(DropdownMenuPrimitive.Label, { ref, className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className), ...props })
);

// Collapsible
const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
const CollapsibleContent = CollapsiblePrimitive.Content;

// Sheet (Dialog-based)
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;
const SheetOverlay = forwardRef(({ className, ...props }, ref) =>
  React.createElement(DialogPrimitive.Overlay, {
    className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
    ...props,
    ref
  })
);
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: { side: "right" },
  }
);
const SheetContent = forwardRef(({ side = "right", className, children, ...props }, ref) =>
  React.createElement(SheetPortal, null,
    React.createElement(SheetOverlay),
    React.createElement(DialogPrimitive.Content, { ref, className: cn(sheetVariants({ side }), className), ...props },
      React.createElement(DialogPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary" },
        React.createElement(X, { className: "h-4 w-4" }),
        React.createElement("span", { className: "sr-only" }, "Close")
      ),
      children
    )
  )
);
const SheetHeader = ({ className, ...props }) =>
  React.createElement("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
const SheetFooter = ({ className, ...props }) =>
  React.createElement("div", { className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className), ...props });
const SheetTitle = forwardRef(({ className, ...props }, ref) =>
  React.createElement(DialogPrimitive.Title, { ref, className: cn("text-lg font-semibold text-foreground", className), ...props })
);
const SheetDescription = forwardRef(({ className, ...props }, ref) =>
  React.createElement(DialogPrimitive.Description, { ref, className: cn("text-sm text-muted-foreground", className), ...props })
);

// Skeleton
const Skeleton = ({ className, ...props }) =>
  React.createElement("div", { className: cn("animate-pulse rounded-md bg-muted", className), ...props });

// ============ SIDEBAR COMPONENTS ============
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const SidebarContext = createContext(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

const SidebarProvider = forwardRef(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
  const isMobile = false;
  const [openMobile, setOpenMobile] = useState(false);
  const [_open, _setOpen] = useControllableState({ prop: openProp, defaultProp: defaultOpen, onChange: setOpenProp });
  const open = _open;
  const setOpen = useCallback((value) => {
    const openState = typeof value === "function" ? value(open) : value;
    _setOpen(openState);
  }, [_setOpen, open]);
  const toggleSidebar = useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const contextValue = useMemo(() => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]);

  return React.createElement(SidebarContext.Provider, { value: contextValue },
    React.createElement(TooltipProvider, { delayDuration: 0 },
      React.createElement("div", {
        style: { "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, ...style },
        className: cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className),
        ref,
        ...props
      }, children)
    )
  );
});
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = forwardRef(({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  if (collapsible === "none") {
    return React.createElement("div", { className: cn("flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground", className), ref, ...props }, children);
  }
  if (isMobile) {
    return React.createElement(Sheet, { open: openMobile, onOpenChange: setOpenMobile },
      React.createElement(SheetContent, { "data-sidebar": "sidebar", "data-mobile": "true", className: "w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden", style: { "--sidebar-width": SIDEBAR_WIDTH_MOBILE }, side },
        React.createElement("div", { className: "flex h-full w-full flex-col" }, children)
      )
    );
  }
  return React.createElement("div", { ref, className: "group peer hidden md:block text-sidebar-foreground", "data-state": state, "data-collapsible": state === "collapsed" ? collapsible : "", "data-variant": variant, "data-side": side },
    React.createElement("div", { className: cn("duration-200 relative h-svh w-[--sidebar-width] bg-transparent transition-[width] ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]" : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]") }),
    React.createElement("div", { className: cn("duration-200 fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] ease-linear md:flex", side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]", variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]" : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l", className), ...props },
      React.createElement("div", { "data-sidebar": "sidebar", className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow" }, children)
    )
  );
});
Sidebar.displayName = "Sidebar";

const SidebarTrigger = forwardRef(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return React.createElement(Button, { ref, "data-sidebar": "trigger", variant: "ghost", size: "icon", className: cn("h-7 w-7", className), onClick: (event) => { onClick?.(event); toggleSidebar(); }, ...props },
    React.createElement(PanelLeft, null),
    React.createElement("span", { className: "sr-only" }, "Toggle Sidebar")
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarRail = forwardRef(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return React.createElement("button", { ref, "data-sidebar": "rail", "aria-label": "Toggle Sidebar", tabIndex: -1, onClick: toggleSidebar, title: "Toggle Sidebar", className: cn("absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex", "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize", "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize", "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar", "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2", "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2", className), ...props });
});
SidebarRail.displayName = "SidebarRail";

const SidebarInset = forwardRef(({ className, ...props }, ref) =>
  React.createElement("main", { ref, className: cn("relative flex min-h-svh flex-1 flex-col bg-background", "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow", className), ...props })
);
SidebarInset.displayName = "SidebarInset";

const SidebarInput = forwardRef(({ className, ...props }, ref) =>
  React.createElement(Input, { ref, "data-sidebar": "input", className: cn("h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", className), ...props })
);
SidebarInput.displayName = "SidebarInput";

const SidebarHeader = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, "data-sidebar": "header", className: cn("flex flex-col gap-2 p-2", className), ...props })
);
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, "data-sidebar": "footer", className: cn("flex flex-col gap-2 p-2", className), ...props })
);
SidebarFooter.displayName = "SidebarFooter";

const SidebarSeparator = forwardRef(({ className, ...props }, ref) =>
  React.createElement(Separator, { ref, "data-sidebar": "separator", className: cn("mx-2 w-auto bg-sidebar-border", className), ...props })
);
SidebarSeparator.displayName = "SidebarSeparator";

const SidebarContent = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, "data-sidebar": "content", className: cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className), ...props })
);
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, "data-sidebar": "group", className: cn("relative flex w-full min-w-0 flex-col p-2", className), ...props })
);
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return React.createElement(Comp, { ref, "data-sidebar": "group-label", className: cn("duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className), ...props });
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return React.createElement(Comp, { ref, "data-sidebar": "group-action", className: cn("absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "after:absolute after:-inset-2 after:md:hidden", "group-data-[collapsible=icon]:hidden", className), ...props });
});
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, "data-sidebar": "group-content", className: cn("w-full text-sm", className), ...props })
);
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = forwardRef(({ className, ...props }, ref) =>
  React.createElement("ul", { ref, "data-sidebar": "menu", className: cn("flex w-full min-w-0 flex-col gap-1", className), ...props })
);
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = forwardRef(({ className, ...props }, ref) =>
  React.createElement("li", { ref, "data-sidebar": "menu-item", className: cn("group/menu-item relative", className), ...props })
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: { default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]" },
      size: { default: "h-8 text-sm", sm: "h-7 text-xs", lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const SidebarMenuButton = forwardRef(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();
  const button = React.createElement(Comp, { ref, "data-sidebar": "menu-button", "data-size": size, "data-active": isActive, className: cn(sidebarMenuButtonVariants({ variant, size }), className), ...props });
  if (!tooltip) return button;
  if (typeof tooltip === "string") tooltip = { children: tooltip };
  return React.createElement(Tooltip, null,
    React.createElement(TooltipTrigger, { asChild: true }, button),
    React.createElement(TooltipContent, { side: "right", align: "center", hidden: state !== "collapsed" || isMobile, ...tooltip })
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return React.createElement(Comp, { ref, "data-sidebar": "menu-action", className: cn("absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0", "after:absolute after:-inset-2 after:md:hidden", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=default]/menu-button:top-1.5", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0", className), ...props });
});
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = forwardRef(({ className, ...props }, ref) =>
  React.createElement("div", { ref, "data-sidebar": "menu-badge", className: cn("absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none", "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=default]/menu-button:top-1.5", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", className), ...props })
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = forwardRef(({ className, showIcon = false, ...props }, ref) => {
  const width = useMemo(() => \`\${Math.floor(Math.random() * 40) + 50}%\`, []);
  return React.createElement("div", { ref, "data-sidebar": "menu-skeleton", className: cn("rounded-md h-8 flex gap-2 px-2 items-center", className), ...props },
    showIcon && React.createElement(Skeleton, { className: "size-4 rounded-md", "data-sidebar": "menu-skeleton-icon" }),
    React.createElement(Skeleton, { className: "h-4 flex-1 max-w-[--skeleton-width]", "data-sidebar": "menu-skeleton-text", style: { "--skeleton-width": width } })
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = forwardRef(({ className, ...props }, ref) =>
  React.createElement("ul", { ref, "data-sidebar": "menu-sub", className: cn("mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5", "group-data-[collapsible=icon]:hidden", className), ...props })
);
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = forwardRef(({ ...props }, ref) =>
  React.createElement("li", { ref, ...props })
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = forwardRef(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  return React.createElement(Comp, { ref, "data-sidebar": "menu-sub-button", "data-size": size, "data-active": isActive, className: cn("flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground", "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground", size === "sm" && "text-xs", size === "md" && "text-sm", "group-data-[collapsible=icon]:hidden", className), ...props });
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

// Make all components available globally
Object.assign(window, {
  React, useState, useEffect, useCallback, useMemo, useRef, createContext, useContext, forwardRef, Fragment,
  cn, clsx, twMerge, cva, Slot,
  Button, buttonVariants, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, badgeVariants, Separator, ScrollArea, ScrollBar, Avatar, AvatarImage, AvatarFallback, Skeleton,
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
  Collapsible, CollapsibleTrigger, CollapsibleContent,
  Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription,
  SidebarProvider, Sidebar, SidebarTrigger, SidebarRail, SidebarInset, SidebarInput, SidebarHeader, SidebarFooter,
  SidebarSeparator, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar,
  ...LucideIcons
});
`
}

/**
 * Build a complete HTML document for rendering React artifacts in an external browser
 * with full shadcn/ui support via esm.sh
 */
export function buildReactBrowserDocument(code: string, title: string, theme: 'light' | 'dark' = 'light'): string {
  const transformedCode = transformReactImports(code)

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>${getTailwindConfig()}</script>
  <style>${getShadcnCssVariables()}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
${getShadcnComponentsScript()}

// User code
${transformedCode}

// Try to render the default export or App component
const Component = typeof App !== 'undefined' ? App : (typeof exports !== 'undefined' && exports.default ? exports.default : null);
if (Component) {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Component));
} else {
  document.getElementById('root').innerHTML = '<p style="color: red; padding: 20px;">No App component found. Make sure your code defines a function called App.</p>';
}
  </script>
</body>
</html>`
}
