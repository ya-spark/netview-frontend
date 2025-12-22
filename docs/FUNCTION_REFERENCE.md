# Function Reference

This document provides a brief overview of all functions, components, and methods in the codebase.

## Table of Contents

- [Root](#)
- [components](#components)
- [components/monitor](#components-monitor)
- [components/probes](#components-probes)
- [components/probes/probe-config-sections](#components-probes-probe-config-sections)
- [components/ui](#components-ui)
- [contexts](#contexts)
- [data](#data)
- [hooks](#hooks)
- [lib](#lib)
- [pages](#pages)
- [pages/docs](#pages-docs)
- [pages/onboarding](#pages-onboarding)
- [services](#services)
- [types](#types)
- [utils](#utils)

---

## Root

### `App.tsx`

- **Component `ProtectedRoute`** (line 37)
- **Component `PreAuthRoute`** (line 107)
- **Component `PublicRoute`** (line 114)
- **Component `LoginRoute`** (line 142)
- **Component `OnboardingRoute`** (line 163)
- **Component `TenantSelectionRoute`** (line 188)
- **Component `Router`** (line 219)
- **Component `PublicEmailErrorRoute`** (line 450)
- **Component `EmailVerificationRoute`** (line 469)
- **Component `AppContent`** (line 522)
- **Component `App`** (line 556)
- `isValidProtectedRoute()` (line 77)

### `main.tsx`

*No functions or components found*

## components

### `components/DateRangePicker.tsx`

- **Component `DateRangePicker`** (line 17)

### `components/ErrorDisplay.tsx`

- **Component `ErrorDisplay`** (line 13)
- `async handleLogout()` (line 19)

### `components/Header.tsx`

- **Component `Header`** (line 23)
- **Component `TenantSwitcher`** (line 285)
- `getInitials()` (line 71)
- `first()` (line 72)
- `last()` (line 73)
- `async handleSignOut()` (line 86)
- `tenants()` (line 312)
- `async handleSwitchTenant()` (line 314)

### `components/InvitationBanner.tsx`

- **Component `InvitationBanner`** (line 16)
- `handleDismiss()` (line 82)

### `components/Layout.tsx`

- **Component `Layout`** (line 12)

### `components/MultiSelect.tsx`

- **Component `MultiSelect`** (line 22)
- `handleToggle()` (line 32)
- `handleSelectAll()` (line 40)

### `components/NotificationDropdown.tsx`

- **Component `NotificationDropdown`** (line 25)
- `handleNotificationClick()` (line 92)
- `getNotificationIcon()` (line 107)
- `getNotificationTitle()` (line 118)

### `components/PublicFooter.tsx`

- **Component `PublicFooter`** (line 1)

### `components/PublicHeader.tsx`

- **Component `PublicHeader`** (line 4)

### `components/PublicLayout.tsx`

- **Component `PublicLayout`** (line 9)

### `components/Sidebar.tsx`

- **Component `DashboardSidebar`** (line 65)
- **Component `ManageSidebar`** (line 323)
- **Component `MonitorSidebar`** (line 435)
- **Component `ReportsSidebar`** (line 499)
- **Component `PublicSidebar`** (line 594)
- **Component `Sidebar`** (line 689)
- `formatTimeAgo()` (line 49)
- `getSidebarContent()` (line 694)

## components/monitor

### `components/monitor/GatewayDetail.tsx`

- **Component `GatewayDetail`** (line 42)
- `formatBytes()` (line 32)
- `handleLogsBreakdownClick()` (line 77)
- `handleDbBreakdownClick()` (line 81)
- `probeName()` (line 376)

### `components/monitor/GatewaysList.tsx`

- **Component `GatewaysList`** (line 26)

### `components/monitor/LogFileViewer.tsx`

- **Component `LogFileViewer`** (line 23)
- `handleDownload()` (line 41)

### `components/monitor/LogsView.tsx`

- **Component `LogsView`** (line 44)
- `handleSearch()` (line 132)
- `handleStatusToggle()` (line 140)
- `convertToISO()` (line 153)

### `components/monitor/MonitorHeader.tsx`

- **Component `MonitorHeader`** (line 11)

### `components/monitor/MonitorOverview.tsx`

- **Component `MonitorOverview`** (line 21)
- `getAlertIcon()` (line 87)

### `components/monitor/ProbeDetail.tsx`

- **Component `ProbeDetail`** (line 29)

### `components/monitor/ProbesList.tsx`

- **Component `ProbesList`** (line 29)

### `components/monitor/StorageBreakdown.tsx`

- **Component `StorageBreakdown`** (line 28)
- `formatBytes()` (line 18)

### `components/monitor/utils.ts`

- `formatDate()` (line 8) - Format a timestamp to a readable date string
- `formatRelativeTime()` (line 17) - Format a timestamp to a relative time string (e.g., "5 minutes ago")
- `getProbeStatusColor()` (line 36) - Get probe status color class (for text)
- `getProbeStatusBgColor()` (line 49) - Get probe status background color class (for badges)
- `getGatewayStatusColor()` (line 62) - Get gateway status color class (for text)
- `getGatewayStatusBgColor()` (line 71) - Get gateway status background color class (for badges) - based on online/offline
- `getGatewayRegistrationStatusBgColor()` (line 79) - Get gateway registration status background color class (for badges)
- `getProbeStatusLabel()` (line 89) - Get probe status label
- `getProbeStatus()` (line 103)
- `formatResponseTime()` (line 130)

## components/probes

### `components/probes/AuthenticationProbeForm.tsx`

- **Component `AuthenticationProbeForm`** (line 27)

### `components/probes/DnsProbeForm.tsx`

- **Component `DnsProbeForm`** (line 19)

### `components/probes/HttpHttpsProbeForm.tsx`

- **Component `HttpHttpsProbeForm`** (line 27)

### `components/probes/ICMPPingProbeForm.tsx`

- **Component `ICMPPingProbeForm`** (line 16)

### `components/probes/ProbeConfigurationDialog.tsx`

- **Component `ProbeConfigurationDialog`** (line 42)
- `handleSubmit()` (line 143)

### `components/probes/ProbeEditDialog.tsx`

- **Component `ProbeEditDialog`** (line 39)
- `handleSubmit()` (line 153)

### `components/probes/ProbeEditForm.tsx`

- **Component `ProbeEditForm`** (line 49)
- `handleSubmit()` (line 176)
- `renderField()` (line 260)
- `renderReadOnlyField()` (line 285)

### `components/probes/ProbeTemplateHelp.tsx`

- **Component `ProbeTemplateHelp`** (line 20)
- `defaultTrigger()` (line 41)

### `components/probes/ProbeTypeSelectionDialog.tsx`

- **Component `ProbeTypeSelectionDialog`** (line 20)

### `components/probes/RunProbeResultModal.tsx`

- **Component `RunProbeResultModal`** (line 33)
- `handleDownload()` (line 53)
- `getStatusIcon()` (line 104)
- `getStatusBadge()` (line 112)

### `components/probes/SslTlsProbeForm.tsx`

- **Component `SslTlsProbeForm`** (line 19)

## components/probes/probe-config-sections

### `components/probes/probe-config-sections/AuthenticationConfigSection.tsx`

- **Component `AuthenticationConfigSection`** (line 24)

### `components/probes/probe-config-sections/DnsConfigSection.tsx`

- **Component `DnsConfigSection`** (line 16)

### `components/probes/probe-config-sections/HttpHttpsConfigSection.tsx`

- **Component `HttpHttpsConfigSection`** (line 24)

### `components/probes/probe-config-sections/IcmpPingConfigSection.tsx`

- **Component `IcmpPingConfigSection`** (line 13)

### `components/probes/probe-config-sections/SslTlsConfigSection.tsx`

- **Component `SslTlsConfigSection`** (line 16)

## components/ui

### `components/ui/accordion.tsx`

- **Component `AccordionItem`** (line 9)
- **Component `AccordionTrigger`** (line 21)
- **Component `AccordionContent`** (line 41)

### `components/ui/alert-dialog.tsx`

- **Component `AlertDialogOverlay`** (line 13)
- **Component `AlertDialogContent`** (line 28)
- **Component `AlertDialogHeader`** (line 46)
- **Component `AlertDialogFooter`** (line 60)
- **Component `AlertDialogTitle`** (line 74)
- **Component `AlertDialogDescription`** (line 86)
- **Component `AlertDialogAction`** (line 99)
- **Component `AlertDialogCancel`** (line 111)

### `components/ui/alert.tsx`

- **Component `Alert`** (line 22)
- **Component `AlertTitle`** (line 35)
- **Component `AlertDescription`** (line 47)

### `components/ui/aspect-ratio.tsx`

*No functions or components found*

### `components/ui/avatar.tsx`

- **Component `Avatar`** (line 8)
- **Component `AvatarImage`** (line 23)
- **Component `AvatarFallback`** (line 35)

### `components/ui/badge.tsx`

- **Component `Badge`** (line 30)

### `components/ui/breadcrumb.tsx`

- **Component `BreadcrumbList`** (line 15)
- **Component `BreadcrumbItem`** (line 30)
- **Component `BreadcrumbPage`** (line 60)
- **Component `BreadcrumbEllipsis`** (line 91)

### `components/ui/button.tsx`

- **Component `Button`** (line 42)

### `components/ui/calendar.tsx`

- **Component `Calendar`** (line 10)

### `components/ui/card.tsx`

- **Component `Card`** (line 5)
- **Component `CardHeader`** (line 20)
- **Component `CardTitle`** (line 32)
- **Component `CardDescription`** (line 47)
- **Component `CardContent`** (line 59)
- **Component `CardFooter`** (line 67)

### `components/ui/carousel.tsx`

- **Component `CarouselContent`** (line 151)
- **Component `CarouselItem`** (line 173)
- **Component `CarouselPrevious`** (line 195)
- **Component `CarouselNext`** (line 224)
- `useCarousel()` (line 33)

### `components/ui/chart.tsx`

- **Component `ChartStyle`** (line 70)
- `useChart()` (line 27)
- `getPayloadConfigFromPayload()` (line 320)

### `components/ui/checkbox.tsx`

- **Component `Checkbox`** (line 7)

### `components/ui/collapsible.tsx`

*No functions or components found*

### `components/ui/command.tsx`

- **Component `Command`** (line 9)
- **Component `CommandInput`** (line 36)
- **Component `CommandList`** (line 55)
- **Component `CommandEmpty`** (line 68)
- **Component `CommandGroup`** (line 81)
- **Component `CommandSeparator`** (line 97)
- **Component `CommandItem`** (line 109)
- **Component `CommandShortcut`** (line 125)

### `components/ui/context-menu.tsx`

- **Component `ContextMenuSubContent`** (line 40)
- **Component `ContextMenuContent`** (line 55)
- **Component `ContextMenuCheckboxItem`** (line 90)
- **Component `ContextMenuRadioItem`** (line 114)
- **Component `ContextMenuSeparator`** (line 154)
- **Component `ContextMenuShortcut`** (line 166)

### `components/ui/datetime-picker.tsx`

- **Component `DateTimePicker`** (line 19)
- `handleDateSelect()` (line 73)
- `handleTimeChange()` (line 90)

### `components/ui/dialog.tsx`

- **Component `DialogOverlay`** (line 17)
- **Component `DialogContent`** (line 32)
- **Component `DialogHeader`** (line 56)
- **Component `DialogFooter`** (line 70)
- **Component `DialogTitle`** (line 84)
- **Component `DialogDescription`** (line 99)

### `components/ui/drawer.tsx`

- **Component `Drawer`** (line 8)
- **Component `DrawerOverlay`** (line 25)
- **Component `DrawerContent`** (line 37)
- **Component `DrawerHeader`** (line 58)
- **Component `DrawerFooter`** (line 69)
- **Component `DrawerTitle`** (line 80)
- **Component `DrawerDescription`** (line 95)

### `components/ui/dropdown-menu.tsx`

- **Component `DropdownMenuSubContent`** (line 41)
- **Component `DropdownMenuContent`** (line 57)
- **Component `DropdownMenuCheckboxItem`** (line 93)
- **Component `DropdownMenuRadioItem`** (line 117)
- **Component `DropdownMenuSeparator`** (line 157)
- **Component `DropdownMenuShortcut`** (line 169)

### `components/ui/form.tsx`

- **Component `FormItem`** (line 75)
- **Component `FormLabel`** (line 89)
- **Component `FormControl`** (line 106)
- **Component `FormDescription`** (line 128)
- **Component `FormMessage`** (line 145)
- `useFormField()` (line 44)

### `components/ui/hover-card.tsx`

- **Component `HoverCardContent`** (line 12)

### `components/ui/input-otp.tsx`

- **Component `InputOTP`** (line 7)
- **Component `InputOTPGroup`** (line 23)
- **Component `InputOTPSlot`** (line 31)
- **Component `InputOTPSeparator`** (line 59)

### `components/ui/input.tsx`

- **Component `Input`** (line 5)

### `components/ui/label.tsx`

*No functions or components found*

### `components/ui/menubar.tsx`

- **Component `MenubarMenu`** (line 9)
- **Component `MenubarGroup`** (line 15)
- **Component `MenubarPortal`** (line 21)
- **Component `MenubarRadioGroup`** (line 27)
- **Component `MenubarSub`** (line 33)
- **Component `Menubar`** (line 39)
- **Component `MenubarTrigger`** (line 54)
- **Component `MenubarSubContent`** (line 90)
- **Component `MenubarCheckboxItem`** (line 148)
- **Component `MenubarRadioItem`** (line 171)
- **Component `MenubarSeparator`** (line 211)
- **Component `MenubarShortcut`** (line 223)

### `components/ui/navigation-menu.tsx`

- **Component `NavigationMenu`** (line 8)
- **Component `NavigationMenuList`** (line 26)
- **Component `NavigationMenuTrigger`** (line 47)
- **Component `NavigationMenuContent`** (line 65)
- **Component `NavigationMenuViewport`** (line 82)
- **Component `NavigationMenuIndicator`** (line 100)

### `components/ui/pagination.tsx`

- **Component `PaginationContent`** (line 17)
- **Component `PaginationItem`** (line 29)
- **Component `PaginationPrevious`** (line 62)
- **Component `PaginationNext`** (line 78)
- **Component `PaginationEllipsis`** (line 94)

### `components/ui/popover.tsx`

- **Component `PopoverContent`** (line 10)

### `components/ui/progress.tsx`

- **Component `Progress`** (line 8)

### `components/ui/radio-group.tsx`

- **Component `RadioGroup`** (line 7)
- **Component `RadioGroupItem`** (line 21)

### `components/ui/resizable.tsx`

- **Component `ResizablePanelGroup`** (line 8)

### `components/ui/scroll-area.tsx`

- **Component `ScrollArea`** (line 6)
- **Component `ScrollBar`** (line 24)

### `components/ui/select.tsx`

- **Component `SelectTrigger`** (line 15)
- **Component `SelectScrollUpButton`** (line 35)
- **Component `SelectScrollDownButton`** (line 52)
- **Component `SelectContent`** (line 70)
- **Component `SelectLabel`** (line 102)
- **Component `SelectItem`** (line 114)
- **Component `SelectSeparator`** (line 137)

### `components/ui/separator.tsx`

*No functions or components found*

### `components/ui/sheet.tsx`

- **Component `SheetOverlay`** (line 18)
- **Component `SheetContent`** (line 56)
- **Component `SheetHeader`** (line 77)
- **Component `SheetFooter`** (line 91)
- **Component `SheetTitle`** (line 105)
- **Component `SheetDescription`** (line 117)

### `components/ui/sidebar.tsx`

- **Component `SidebarTrigger`** (line 248)
- **Component `SidebarRail`** (line 274)
- **Component `SidebarInset`** (line 303)
- **Component `SidebarInput`** (line 321)
- **Component `SidebarHeader`** (line 339)
- **Component `SidebarFooter`** (line 354)
- **Component `SidebarSeparator`** (line 369)
- **Component `SidebarContent`** (line 384)
- **Component `SidebarGroup`** (line 402)
- **Component `SidebarGroupLabel`** (line 417)
- **Component `SidebarGroupAction`** (line 438)
- **Component `SidebarGroupContent`** (line 461)
- **Component `SidebarMenu`** (line 474)
- **Component `SidebarMenuItem`** (line 487)
- **Component `SidebarMenuBadge`** (line 612)
- **Component `SidebarMenuSub`** (line 671)
- **Component `SidebarMenuSubItem`** (line 688)
- `useSidebar()` (line 45)
- `handleKeyDown()` (line 105)
- `button()` (line 545)

### `components/ui/skeleton.tsx`

- **Component `Skeleton`** (line 3)

### `components/ui/slider.tsx`

- **Component `Slider`** (line 6)

### `components/ui/switch.tsx`

- **Component `Switch`** (line 6)

### `components/ui/table.tsx`

- **Component `Table`** (line 5)
- **Component `TableHeader`** (line 19)
- **Component `TableBody`** (line 27)
- **Component `TableFooter`** (line 39)
- **Component `TableRow`** (line 54)
- **Component `TableHead`** (line 69)
- **Component `TableCell`** (line 84)
- **Component `TableCaption`** (line 96)

### `components/ui/tabs.tsx`

- **Component `TabsList`** (line 8)
- **Component `TabsTrigger`** (line 23)
- **Component `TabsContent`** (line 38)

### `components/ui/textarea.tsx`

- **Component `Textarea`** (line 5)

### `components/ui/toast.tsx`

- **Component `ToastViewport`** (line 10)
- **Component `ToastAction`** (line 56)
- **Component `ToastClose`** (line 71)
- **Component `ToastTitle`** (line 90)
- **Component `ToastDescription`** (line 102)

### `components/ui/toaster.tsx`

- **Component `Toaster`** (line 11)

### `components/ui/toggle-group.tsx`

*No functions or components found*

### `components/ui/toggle.tsx`

*No functions or components found*

### `components/ui/tooltip.tsx`

- **Component `TooltipContent`** (line 14)

## contexts

### `contexts/AuthContext.tsx`

- **Component `AuthProvider`** (line 66)
- `async checkAuth()` (line 383)
- `async signOut()` (line 429)
- `async loginWithGoogle()` (line 483)
- `async loginWithEmailPassword()` (line 509)
- `clearError()` (line 537)
- `clearEmailVerification()` (line 541)
- `async retryRegistration()` (line 545)
- `async createTenant()` (line 619)
- `handleSetSelectedTenant()` (line 714)
- `useAuth()` (line 774)

## data

### `data/probeTemplates.ts`

- `getTemplateById()` (line 97) - Get template by ID
- `getTemplatesByCategoryAndType()` (line 104) - Get templates by category and type
- `getTemplateByCategoryAndType()` (line 116) - Get first template matching category and type (for backward compatibility)
- `getAllTemplates()` (line 128) - Get all templates

## hooks

### `hooks/use-mobile.tsx`

- `useIsMobile()` (line 5)
- `onChange()` (line 10)

### `hooks/use-toast.ts`

- `genId()` (line 27)
- `addToRemoveQueue()` (line 58)
- `reducer()` (line 74)
- `dispatch()` (line 133)
- `toast()` (line 142)
- `update()` (line 145)
- `dismiss()` (line 150)
- `useToast()` (line 171)

## lib

### `lib/firebase.ts`

- `async signInWithGoogle()` (line 67) - Sign in with Google using popup  @returns Promise that resolves with Firebase User
- `async createUserWithEmailAndPassword()` (line 106)
- `async signInWithEmailPassword()` (line 152)
- `async signOut()` (line 199) - Sign out current user
- `getCurrentUser()` (line 224) - Get current Firebase user  @returns Current Firebase User or null if not authenticated
- `async getIdToken()` (line 233)
- `onAuthStateChange()` (line 258)

### `lib/logger.ts`

- `getLogLevel()` (line 65) - Get the current log level from environment variable  Defaults to INFO if not set or invalid
- `getLogFormat()` (line 81)
- `isDevelopmentMode()` (line 92) - Check if running in development mode
- `isProductionMode()` (line 99) - Check if running in production mode
- `shouldLog()` (line 111) - Check if a log level should be logged based on current configuration
- `sanitizeData()` (line 118) - Sanitize sensitive data from strings
- `formatAsJSON()` (line 170) - Format log entry as JSON
- `formatAsText()` (line 177) - Format log entry as human-readable text
- `createLogEntry()` (line 195) - Create a log entry
- `outputLog()` (line 230) - Output log entry to console
- `createLogger()` (line 354) - Create a logger instance with default context  Useful for component-level logging

### `lib/queryClient.ts`

- `getApiBaseUrl()` (line 10)
- `buildApiUrl()` (line 33)
- `setGlobalErrorHandler()` (line 52)
- `async throwIfResNotOk()` (line 73)
- `setCurrentUserInfo()` (line 157)
- `async getAuthHeaders()` (line 166)
- `async apiRequest()` (line 193)

### `lib/utils.ts`

- `cn()` (line 4)

## pages

### `pages/AcceptInvitation.tsx`

- **Component `AcceptInvitation`** (line 16)

### `pages/Billing.tsx`

- **Component `Billing`** (line 188)
- `getStripePromise()` (line 34)
- `async fetchPricingPlans()` (line 64)
- `async handleSubmit()` (line 140)
- `handlePlanSelect()` (line 226)
- `handleSubscriptionSuccess()` (line 238)

### `pages/Collaborators.tsx`

- **Component `Collaborators`** (line 42)
- `handleEditClick()` (line 250)
- `handleDeleteClick()` (line 263)
- `handleDeleteConfirm()` (line 269)
- `getRoleIcon()` (line 275)
- `getRoleBadge()` (line 292)

### `pages/CreateProbe.tsx`

- **Component `CreateProbe`** (line 33)
- `handleTemplateSelect()` (line 137)
- `handleBackToTemplates()` (line 146)
- `getProbeTypeIcon()` (line 154)
- `handleCategoryChange()` (line 225)
- `handleSubmit()` (line 330)

### `pages/Dashboard.tsx`

- **Component `Dashboard`** (line 20)
- `async handleRefresh()` (line 149)
- `getAlertIcon()` (line 168)
- `formatDate()` (line 176)

### `pages/EmailVerification.tsx`

- **Component `EmailVerification`** (line 27)
- `async handleVerifyCode()` (line 70)

### `pages/Features.tsx`

- **Component `Features`** (line 5)

### `pages/Landing.tsx`

- **Component `Landing`** (line 6)

### `pages/LoggedOut.tsx`

- **Component `LoggedOut`** (line 7)
- `handleLogin()` (line 10)

### `pages/Login.tsx`

- **Component `Login`** (line 26)
- `getTenantCheckKey()` (line 39)
- `markTenantCheckComplete()` (line 40)
- `isTenantCheckComplete()` (line 45)
- `clearTenantCheckFlag()` (line 49)
- `getRedirectPath()` (line 66)
- `isValidProtectedRoute()` (line 72)
- `async checkAndHandleTenants()` (line 218)
- `async handleGoogleLogin()` (line 403)
- `async handleEmailPasswordLogin()` (line 426)

### `pages/Manage.tsx`

- **Component `Manage`** (line 52)
- `handleCloseProbe()` (line 113)
- `handleCloseGatewayDialog()` (line 119)
- `handleCloseNotificationDialog()` (line 127)
- `handleRunProbeAgain()` (line 432)
- `handleCloseRunProbeModal()` (line 438)
- `handleEditNotificationGroup()` (line 553)
- `handleDeleteNotificationGroup()` (line 557)
- `getTypeBadge()` (line 766)
- `getProbeTypeIcon()` (line 774)

### `pages/Monitor.tsx`

- **Component `Monitor`** (line 28)
- `getGatewayName()` (line 240)
- `getLatestProbeResult()` (line 247)
- `async handleRefresh()` (line 252)
- `getPageTitle()` (line 321)
- `getPageDescription()` (line 330)

### `pages/Onboarding.tsx`

- **Component `Onboarding`** (line 34)
- `pendingInvitations()` (line 75)
- `async handleAcceptInvitation()` (line 198)
- `async handleVerifyCode()` (line 284)
- `async handleCreateTenant()` (line 360)
- `goToStep()` (line 407)
- `getStepLabel()` (line 422)
- `getTotalSteps()` (line 435)

### `pages/Pricing.tsx`

- **Component `Pricing`** (line 8)

### `pages/ProbeStatus.tsx`

- **Component `ProbeStatus`** (line 14)
- `getStatusIcon()` (line 106)

### `pages/PublicEmailError.tsx`

- **Component `PublicEmailError`** (line 12)
- `async handleSignOut()` (line 16)

### `pages/Reports.tsx`

- **Component `Reports`** (line 19)
- `async handleDownload()` (line 81)

### `pages/Settings.tsx`

- **Component `Settings`** (line 37)

### `pages/SignUp.tsx`

- **Component `SignUp`** (line 34)
- `async handleGoogleSignUp()` (line 52)
- `async handleSubmit()` (line 158)

### `pages/TenantSelection.tsx`

- **Component `TenantSelection`** (line 31)
- `getRedirectData()` (line 121)
- `async handleCreateTenant()` (line 161)
- `isValidProtectedRoute()` (line 230)
- `async handleSelectTenant()` (line 284)
- `isValidProtectedRoute()` (line 328)

### `pages/not-found.tsx`

- **Component `NotFound`** (line 4)

## pages/docs

### `pages/docs/index.tsx`

- **Component `Docs`** (line 7)

## pages/onboarding

### `pages/onboarding/Invites.tsx`

- **Component `Invites`** (line 25)
- `pendingInvitations()` (line 58)
- `getUserDetails()` (line 62)
- `async handleAcceptInvitation()` (line 75)
- `async handleCreateTenant()` (line 174)

### `pages/onboarding/OnboardingRouter.tsx`

- **Component `OnboardingRouter`** (line 18)
- `async checkUserStatus()` (line 28)
- `isValidProtectedRoute()` (line 90)

### `pages/onboarding/SelectTenant.tsx`

- **Component `SelectTenant`** (line 25)
- `getRedirectData()` (line 35)
- `tenants()` (line 81)
- `isValidProtectedRoute()` (line 128)

### `pages/onboarding/VerifyEmail.tsx`

- **Component `VerifyEmail`** (line 58)
- `extractUserDetailsFromFirebase()` (line 32) - Extract user details from Firebase user
- `async handleSubmitDetails()` (line 153)
- `async handleVerifyCode()` (line 202)

## services

### `services/alertApi.ts`

*No functions or components found*

### `services/authApi.ts`

- `async sendVerificationCode()` (line 10) - Send verification code to email address  @returns Promise that resolves when code is sent
- `async verifyCode()` (line 27)
- `async getCurrentUser()` (line 43) - Get current authenticated user from backend  @returns Promise that resolves with User object
- `async registerUser()` (line 82)
- `async getUserTenants()` (line 131) - Get all tenants the current user belongs to  @returns Promise that resolves with list of Tenant objects
- `async setPrimaryTenant()` (line 155)
- `async logout()` (line 179)

### `services/collaboratorApi.ts`

- `getCollaboratorHeaders()` (line 17) - Helper function to create headers required by Collaborators API

### `services/dashboardApi.ts`

*No functions or components found*

### `services/gatewayApi.ts`

*No functions or components found*

### `services/logsApi.ts`

*No functions or components found*

### `services/notificationApi.ts`

*No functions or components found*

### `services/probeApi.ts`

*No functions or components found*

### `services/tenantApi.ts`

- `generateTenantId()` (line 12)
- `async validateTenantIdAvailability()` (line 38)
- `async createTenant()` (line 97)

## types

### `types/alert.ts`

*No functions or components found*

### `types/collaborator.ts`

*No functions or components found*

### `types/dashboard.ts`

*No functions or components found*

### `types/gateway.ts`

*No functions or components found*

### `types/notification.ts`

*No functions or components found*

### `types/probe.ts`

*No functions or components found*

## utils

### `utils/emailValidation.ts`

- `isBusinessEmail()` (line 51)

### `utils/excelExport.ts`

- `generateExcelReport()` (line 23) - Generate Excel file from data based on report type
- `formatDateForFilename()` (line 88)
- `generateLogsSheet()` (line 92)
- `generateUptimePerGroupSheet()` (line 106)
- `generateDowntimePerGroupSheet()` (line 121)
- `generatePerGatewaySheet()` (line 136)
- `generateIndividualFlowSheet()` (line 151)

