# PolyHarmony Calendar App - UI Components Reference

## Overview
This document serves as a reference for the PolyHarmony Calendar App UI components, documenting the available components, their props, and usage patterns.

## Component Categories

### Form Components (`components/ui/form/`)

#### ErrorAlert
Displays error messages in a styled alert format.

**Props:**
- `error` (string | Error): Error message or Error object
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ErrorAlert error="Invalid email address" />
```

#### FormControl
Wrapper component for form controls with label and error handling.

**Props:**
- `label` (string): Form field label
- `error` (string, optional): Error message
- `children` (ReactNode): Form control element
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<FormControl label="Email" error={errors.email?.message}>
  <Input {...register('email')} />
</FormControl>
```

#### FormError
Displays form validation errors.

**Props:**
- `message` (string): Error message
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
{errors.email && <FormError message={errors.email.message} />}
```

#### FormSubmitButton
Styled submit button for forms with loading state.

**Props:**
- `children` (ReactNode): Button text
- `loading` (boolean): Loading state
- `className` (string, optional): Additional CSS classes
- `...props` (ButtonHTMLAttributes): Additional button props

**Usage:**
```tsx
<FormSubmitButton loading={isSubmitting}>
  Submit
</FormSubmitButton>
```

#### Index
Exports all form components for easy import.

### Core UI Components (`components/ui/`)

#### AccessibleForm
Form component with accessibility features.

**Props:**
- `children` (ReactNode): Form content
- `onSubmit` (FormEventHandler): Submit handler
- `...props` (FormHTMLAttributes): Additional form props

**Usage:**
```tsx
<AccessibleForm onSubmit={handleSubmit}>
  {/* form fields */}
</AccessibleForm>
```

#### Accordion
Collapsible accordion component.

**Props:**
- `type` (enum): Single or multiple items open
- `children` (ReactNode): Accordion items
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Accordion type="single">
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
  </AccordionItem>
</Accordion>
```

#### AlertDialog
Modal dialog for important confirmations.

**Props:**
- `open` (boolean): Whether dialog is open
- `onOpenChange` (function): Open state change handler
- `children` (ReactNode): Dialog content
- `...props` (DialogProps): Additional dialog props

**Usage:**
```tsx
<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Alert
Displays important messages to users.

**Props:**
- `variant` (enum): Alert style variant (default, destructive)
- `children` (ReactNode): Alert content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

#### AspectRatio
Maintains aspect ratio for responsive content.

**Props:**
- `ratio` (number): Aspect ratio (width/height)
- `children` (ReactNode): Content to maintain aspect ratio
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<AspectRatio ratio={16/9}>
  <img src="image.jpg" alt="Description" />
</AspectRatio>
```

#### AttachmentList
Displays a list of file attachments.

**Props:**
- `attachments` (array): Array of attachment objects
- `onRemove` (function): Handler for removing attachments
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<AttachmentList 
  attachments={attachments} 
  onRemove={handleRemoveAttachment} 
/>
```

#### Avatar
User profile image component.

**Props:**
- `src` (string): Image source URL
- `alt` (string): Alternative text
- `fallback` (string): Fallback text when no image
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Avatar src={user.avatar} alt={user.name} fallback={user.initials} />
```

#### Badge
Small status indicator component.

**Props:**
- `variant` (enum): Badge style variant (default, secondary, destructive, outline)
- `children` (ReactNode): Badge content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Badge variant="secondary">Pending</Badge>
```

#### Breadcrumb
Navigation breadcrumb trail.

**Props:**
- `items` (array): Array of breadcrumb items
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Breadcrumb 
  items={[
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
    { label: 'Create Event' }
  ]} 
/>
```

#### BulkActionBar
Action bar for bulk operations on selected items.

**Props:**
- `selectedCount` (number): Number of selected items
- `actions` (array): Array of action objects
- `onClearSelection` (function): Handler to clear selection
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<BulkActionBar 
  selectedCount={selectedEvents.length}
  actions={bulkActions}
  onClearSelection={clearSelection}
/>
```

#### BulkDeleteDialog
Dialog for confirming bulk deletion.

**Props:**
- `open` (boolean): Whether dialog is open
- `onOpenChange` (function): Open state change handler
- `count` (number): Number of items to delete
- `onConfirm` (function): Handler for confirming deletion
- `itemName` (string): Name of items being deleted

**Usage:**
```tsx
<BulkDeleteDialog 
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  count={selectedEvents.length}
  onConfirm={handleBulkDelete}
  itemName="events"
/>
```

#### BulkEditDialog
Dialog for bulk editing multiple items.

**Props:**
- `open` (boolean): Whether dialog is open
- `onOpenChange` (function): Open state change handler
- `count` (number): Number of items to edit
- `onSubmit` (function): Handler for submitting changes
- `fields` (array): Array of editable fields

**Usage:**
```tsx
<BulkEditDialog 
  open={showEditDialog}
  onOpenChange={setShowEditDialog}
  count={selectedEvents.length}
  onSubmit={handleBulkEdit}
  fields={editFields}
/>
```

#### BulkPermissionsDialog
Dialog for setting bulk permissions.

**Props:**
- `open` (boolean): Whether dialog is open
- `onOpenChange` (function): Open state change handler
- `count` (number): Number of items to set permissions for
- `onSubmit` (function): Handler for submitting permissions
- `permissions` (object): Current permissions

**Usage:**
```tsx
<BulkPermissionsDialog 
  open={showPermissionsDialog}
  onOpenChange={setShowPermissionsDialog}
  count={selectedEvents.length}
  onSubmit={handleBulkPermissions}
  permissions={currentPermissions}
/>
```

#### Button
Styled button component.

**Props:**
- `variant` (enum): Button style variant (default, destructive, outline, secondary, ghost, link)
- `size` (enum): Button size (default, sm, lg, icon)
- `children` (ReactNode): Button content
- `className` (string, optional): Additional CSS classes
- `...props` (ButtonHTMLAttributes): Additional button props

**Usage:**
```tsx
<Button variant="destructive" size="sm" onClick={handleDelete}>
  Delete
</Button>
```

#### Calendar
Interactive calendar component.

**Props:**
- `mode` (enum): Selection mode (single, multiple, range)
- `selected` (Date | Date[]): Selected date(s)
- `onSelect` (function): Date selection handler
- `...props` (HTMLAttributes): Additional calendar props

**Usage:**
```tsx
<Calendar 
  mode="single" 
  selected={selectedDate} 
  onSelect={setSelectedDate} 
/>
```

#### Card
Card container component.

**Props:**
- `children` (ReactNode): Card content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Card className="w-full">
  <CardHeader>
    <CardTitle>Event Details</CardTitle>
  </CardHeader>
  <CardContent>
    {/* card content */}
  </CardContent>
</Card>
```

#### Carousel
Image carousel component.

**Props:**
- `images` (array): Array of image URLs
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Carousel images={eventImages} />
```

#### Chart
Data visualization component.

**Props:**
- `data` (array): Chart data
- `type` (enum): Chart type (bar, line, pie)
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Chart data={usageData} type="bar" />
```

#### Checkbox
Checkbox input component.

**Props:**
- `checked` (boolean): Checkbox state
- `onCheckedChange` (function): State change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Checkbox 
  checked={isChecked} 
  onCheckedChange={setChecked} 
/>
```

#### CognitivePatternMonitor
Monitors cognitive patterns in user behavior.

**Props:**
- `patterns` (array): Array of cognitive patterns
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<CognitivePatternMonitor patterns={detectedPatterns} />
```

#### CognitivePatternSelector
Selector for choosing cognitive patterns.

**Props:**
- `value` (string): Selected pattern
- `onValueChange` (function): Value change handler
- `patterns` (array): Available patterns
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<CognitivePatternSelector 
  value={selectedPattern}
  onValueChange={setSelectedPattern}
  patterns={availablePatterns}
/>
```

#### Collapsible
Collapsible content component.

**Props:**
- `open` (boolean): Whether content is open
- `onOpenChange` (function): Open state change handler
- `children` (ReactNode): Collapsible content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger>Toggle</CollapsibleTrigger>
  <CollapsibleContent>
    {/* collapsible content */}
  </CollapsibleContent>
</Collapsible>
```

#### ColorPicker
Color selection component.

**Props:**
- `value` (string): Selected color
- `onValueChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ColorPicker 
  value={selectedColor} 
  onValueChange={setSelectedColor} 
/>
```

#### Command
Command palette component.

**Props:**
- `open` (boolean): Whether palette is open
- `onOpenChange` (function): Open state change handler
- `children` (ReactNode): Palette content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Command open={isOpen} onOpenChange={setIsOpen}>
  <CommandInput placeholder="Type a command or search..." />
  <CommandList>
    <CommandGroup heading="Suggestions">
      <CommandItem>Calendar</CommandItem>
      <CommandItem>Search Emoji</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

#### ConflictDetector
Detects scheduling conflicts.

**Props:**
- `events` (array): Array of events to check
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ConflictDetector events={upcomingEvents} />
```

#### ConflictResolverLazy
Lazy-loaded conflict resolver component.

**Props:**
- `conflicts` (array): Array of conflicts to resolve
- `onResolve` (function): Handler for resolving conflicts
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ConflictResolverLazy 
  conflicts={detectedConflicts} 
  onResolve={handleResolveConflicts} 
/>
```

#### ConflictResolver
Conflict resolution component.

**Props:**
- `conflicts` (array): Array of conflicts to resolve
- `onResolve` (function): Handler for resolving conflicts
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ConflictResolver 
  conflicts={detectedConflicts} 
  onResolve={handleResolveConflicts} 
/>
```

#### ConflictWarning
Warning display for conflicts.

**Props:**
- `conflicts` (array): Array of conflicts
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ConflictWarning conflicts={detectedConflicts} />
```

#### ConnectionSetup
Setup component for connection establishment.

**Props:**
- `onSetup` (function): Handler for setup completion
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ConnectionSetup onSetup={handleConnectionSetup} />
```

#### ContactForm
Form for creating/editing contacts.

**Props:**
- `contact` (object, optional): Contact data for editing
- `onSubmit` (function): Form submission handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ContactForm 
  contact={editingContact} 
  onSubmit={handleSubmit} 
/>
```

#### ContactPickerLazy
Lazy-loaded contact picker component.

**Props:**
- `selected` (array): Selected contacts
- `onSelect` (function): Selection handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ContactPickerLazy 
  selected={selectedContacts} 
  onSelect={setSelectedContacts} 
/>
```

#### ContactPicker
Contact selection component.

**Props:**
- `selected` (array): Selected contacts
- `onSelect` (function): Selection handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ContactPicker 
  selected={selectedContacts} 
  onSelect={setSelectedContacts} 
/>
```

#### ContextMenu
Context menu component.

**Props:**
- `children` (ReactNode): Menu content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ContextMenu>
  <ContextMenuTrigger>Right click me</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Profile</ContextMenuItem>
    <ContextMenuItem>Settings</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

#### Dialog
Modal dialog component.

**Props:**
- `open` (boolean): Whether dialog is open
- `onOpenChange` (function): Open state change handler
- `children` (ReactNode): Dialog content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Event</DialogTitle>
    </DialogHeader>
    <DialogDescription>
      Make changes to your event here.
    </DialogDescription>
    {/* dialog content */}
  </DialogContent>
</Dialog>
```

#### Drawer
Drawer component for mobile-friendly overlays.

**Props:**
- `open` (boolean): Whether drawer is open
- `onOpenChange` (function): Open state change handler
- `children` (ReactNode): Drawer content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Drawer open={isOpen} onOpenChange={setIsOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Event Details</DrawerTitle>
    </DrawerHeader>
    <DrawerDescription>
      View and edit event information.
    </DrawerDescription>
    {/* drawer content */}
  </DrawerContent>
</Drawer>
```

#### FileUploaderLazy
Lazy-loaded file upload component.

**Props:**
- `onUpload` (function): Upload handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<FileUploaderLazy onUpload={handleFileUpload} />
```

#### FileUploader
File upload component.

**Props:**
- `onUpload` (function): Upload handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<FileUploader onUpload={handleFileUpload} />
```

#### GroupForm
Form for creating/editing groups.

**Props:**
- `group` (object, optional): Group data for editing
- `onSubmit` (function): Form submission handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<GroupForm 
  group={editingGroup} 
  onSubmit={handleSubmit} 
/>
```

#### GroupFunctionalitySelector
Selector for group functionality options.

**Props:**
- `value` (object): Selected functionality options
- `onValueChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<GroupFunctionalitySelector 
  value={selectedFunctionality}
  onValueChange={setSelectedFunctionality}
/>
```

#### GroupInvitationList
List of group invitations.

**Props:**
- `invitations` (array): Array of invitations
- `onAccept` (function): Handler for accepting invitations
- `onDecline` (function): Handler for declining invitations
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<GroupInvitationList 
  invitations={pendingInvitations}
  onAccept={handleAcceptInvitation}
  onDecline={handleDeclineInvitation}
/>
```

#### GroupInvitationSender
Component for sending group invitations.

**Props:**
- `groupId` (string): ID of group to invite to
- `onSend` (function): Handler for sending invitations
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<GroupInvitationSender 
  groupId={currentGroup.id}
  onSend={handleSendInvitation}
/>
```

#### GroupInvitationSetup
Setup component for group invitations.

**Props:**
- `onSetup` (function): Handler for setup completion
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<GroupInvitationSetup onSetup={handleInvitationSetup} />
```

#### GroupOrganizationTool
Tool for organizing groups.

**Props:**
- `groups` (array): Array of groups
- `onOrganize` (function): Handler for organization changes
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<GroupOrganizationTool 
  groups={userGroups}
  onOrganize={handleGroupOrganization}
/>
```

#### HoverCard
Hover card component for additional information.

**Props:**
- `children` (ReactNode): Card content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<HoverCard>
  <HoverCardTrigger>Hover me</HoverCardTrigger>
  <HoverCardContent>
    This is additional information.
  </HoverCardContent>
</HoverCard>
```

#### InputOTP
One-time password input component.

**Props:**
- `value` (string): Current value
- `onChange` (function): Value change handler
- `length` (number): Length of OTP
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<InputOTP 
  value={otpValue}
  onChange={setOtpValue}
  length={6}
/>
```

#### Input
Text input component.

**Props:**
- `type` (string): Input type (text, email, password, etc.)
- `value` (string): Current value
- `onChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes
- `...props` (InputHTMLAttributes): Additional input props

**Usage:**
```tsx
<Input 
  type="email" 
  value={email} 
  onChange={(e) => setEmail(e.target.value)} 
  placeholder="Enter your email"
/>
```

#### InvitationList
List of invitations.

**Props:**
- `invitations` (array): Array of invitations
- `onAccept` (function): Handler for accepting invitations
- `onDecline` (function): Handler for declining invitations
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<InvitationList 
  invitations={pendingInvitations}
  onAccept={handleAcceptInvitation}
  onDecline={handleDeclineInvitation}
/>
```

#### InvitationSender
Component for sending invitations.

**Props:**
- `onSend` (function): Handler for sending invitations
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<InvitationSender onSend={handleSendInvitation} />
```

#### KeyboardNavigation
Keyboard navigation helper component.

**Props:**
- `children` (ReactNode): Content with keyboard navigation
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<KeyboardNavigation>
  {/* content with keyboard navigation */}
</KeyboardNavigation>
```

#### Label
Form label component.

**Props:**
- `children` (ReactNode): Label content
- `className` (string, optional): Additional CSS classes
- `...props` (LabelHTMLAttributes): Additional label props

**Usage:**
```tsx
<Label htmlFor="email">Email Address</Label>
```

#### Menubar
Menubar component for navigation.

**Props:**
- `children` (ReactNode): Menubar content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New Event</MenubarItem>
      <MenubarItem>Import</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>
```

#### MobileForm
Mobile-optimized form component.

**Props:**
- `children` (ReactNode): Form content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<MobileForm>
  {/* mobile-optimized form fields */}
</MobileForm>
```

#### MobileImage
Mobile-optimized image component.

**Props:**
- `src` (string): Image source
- `alt` (string): Alternative text
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<MobileImage src={imageUrl} alt="Description" />
```

#### MobileNavigation
Mobile navigation component.

**Props:**
- `items` (array): Navigation items
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<MobileNavigation items={navItems} />
```

#### NaturalLanguageInputLazy
Lazy-loaded natural language input component.

**Props:**
- `value` (string): Current value
- `onChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<NaturalLanguageInputLazy 
  value={inputValue}
  onChange={setInputValue}
/>
```

#### NaturalLanguageInput
Natural language input component.

**Props:**
- `value` (string): Current value
- `onChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<NaturalLanguageInput 
  value={inputValue}
  onChange={setInputValue}
/>
```

#### NavigationMenu
Navigation menu component.

**Props:**
- `children` (ReactNode): Menu content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Events</NavigationMenuTrigger>
      <NavigationMenuContent>
        <NavigationMenuLink>Create Event</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

#### Notifications
Notification display component.

**Props:**
- `notifications` (array): Array of notifications
- `onDismiss` (function): Handler for dismissing notifications
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Notifications 
  notifications={userNotifications}
  onDismiss={handleDismissNotification}
/>
```

#### OnboardingStepTransition
Transition component for onboarding steps.

**Props:**
- `children` (ReactNode): Content to transition
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<OnboardingStepTransition>
  {/* onboarding step content */}
</OnboardingStepTransition>
```

#### Pagination
Pagination component.

**Props:**
- `currentPage` (number): Current page number
- `totalPages` (number): Total number of pages
- `onPageChange` (function): Page change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Pagination 
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={handlePageChange}
/>
```

#### PerformanceMonitor
Performance monitoring component.

**Props:**
- `metrics` (object): Performance metrics
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<PerformanceMonitor metrics={performanceMetrics} />
```

#### PermissionEditor
Permission editing component.

**Props:**
- `permissions` (object): Current permissions
- `onChange` (function): Permission change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<PermissionEditor 
  permissions={currentPermissions}
  onChange={handlePermissionChange}
/>
```

#### Popover
Popover component.

**Props:**
- `open` (boolean): Whether popover is open
- `onOpenChange` (function): Open state change handler
- `children` (ReactNode): Popover content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>
    This is the popover content.
  </PopoverContent>
</Popover>
```

#### PrivacyLevelSelector
Privacy level selection component.

**Props:**
- `value` (string): Selected privacy level
- `onValueChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<PrivacyLevelSelector 
  value={selectedPrivacy}
  onValueChange={setSelectedPrivacy}
/>
```

#### Progress
Progress indicator component.

**Props:**
- `value` (number): Current progress value (0-100)
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Progress value={uploadProgress} />
```

#### RadioGroup
Radio group component.

**Props:**
- `value` (string): Selected value
- `onValueChange` (function): Value change handler
- `children` (ReactNode): Radio items
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
  <RadioGroupItem value="option1">Option 1</RadioGroupItem>
  <RadioGroupItem value="option2">Option 2</RadioGroupItem>
</RadioGroup>
```

#### RecurrenceEditorLazy
Lazy-loaded recurrence editor component.

**Props:**
- `value` (string): Current recurrence rule
- `onChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<RecurrenceEditorLazy 
  value={recurrenceRule}
  onChange={setRecurrenceRule}
/>
```

#### RecurrenceEditor
Recurrence editor component.

**Props:**
- `value` (string): Current recurrence rule
- `onChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<RecurrenceEditor 
  value={recurrenceRule}
  onChange={setRecurrenceRule}
/>
```

#### RecurrencePreview
Preview of recurrence pattern.

**Props:**
- `rule` (string): Recurrence rule
- `startDate` (Date): Start date for preview
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<RecurrencePreview 
  rule={recurrenceRule}
  startDate={eventStartDate}
/>
```

#### RelationshipIndicator
Indicator for relationship status.

**Props:**
- `relationship` (object): Relationship data
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<RelationshipIndicator relationship={userRelationship} />
```

#### RelationshipItem
Display item for relationships.

**Props:**
- `relationship` (object): Relationship data
- `onEdit` (function): Handler for editing
- `onDelete` (function): Handler for deletion
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<RelationshipItem 
  relationship={userRelationship}
  onEdit={handleEditRelationship}
  onDelete={handleDeleteRelationship}
/>
```

#### Resizable
Resizable component.

**Props:**
- `children` (ReactNode): Resizable content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Resizable>
  {/* resizable content */}
</Resizable>
```

#### RoadmapView
Roadmap view component.

**Props:**
- `events` (array): Array of events to display
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<RoadmapView events={upcomingEvents} />
```

#### ScrollArea
Scrollable area component.

**Props:**
- `children` (ReactNode): Scrollable content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ScrollArea>
  {/* scrollable content */}
</ScrollArea>
```

#### Select
Select dropdown component.

**Props:**
- `value` (string): Selected value
- `onValueChange` (function): Value change handler
- `children` (ReactNode): Select options
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

#### Separator
Visual separator component.

**Props:**
- `orientation` (enum): Separator orientation (horizontal, vertical)
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Separator orientation="horizontal" />
```

#### ServiceWorkerRegister
Service worker registration component.

**Props:**
- `children` (ReactNode): Content to display during registration
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ServiceWorkerRegister>
  {/* registration UI */}
</ServiceWorkerRegister>
```

#### ShareDialog
Dialog for sharing content.

**Props:**
- `open` (boolean): Whether dialog is open
- `onOpenChange` (function): Open state change handler
- `content` (object): Content to share
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ShareDialog 
  open={showShareDialog}
  onOpenChange={setShowShareDialog}
  content={shareContent}
/>
```

#### SharedView
View for shared content.

**Props:**
- `content` (object): Shared content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<SharedView content={sharedEvent} />
```

#### Sheet
Sheet component for side panels.

**Props:**
- `open` (boolean): Whether sheet is open
- `onOpenChange` (function): Open state change handler
- `children` (ReactNode): Sheet content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Event Details</SheetTitle>
    </SheetHeader>
    <SheetDescription>
      View and edit event information.
    </SheetDescription>
    {/* sheet content */}
  </SheetContent>
</Sheet>
```

#### SimplePrivacySelector
Simple privacy selector component.

**Props:**
- `value` (string): Selected privacy level
- `onValueChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<SimplePrivacySelector 
  value={selectedPrivacy}
  onValueChange={setSelectedPrivacy}
/>
```

#### SimplifiedPrivacySelector
Simplified privacy selector component.

**Props:**
- `value` (string): Selected privacy level
- `onValueChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<SimplifiedPrivacySelector 
  value={selectedPrivacy}
  onValueChange={setSelectedPrivacy}
/>
```

#### Skeleton
Skeleton loading component.

**Props:**
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Skeleton className="h-4 w-32" />
```

#### Slider
Slider input component.

**Props:**
- `value` (number | number[]): Current value
- `onValueChange` (function): Value change handler
- `min` (number): Minimum value
- `max` (number): Maximum value
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Slider 
  value={sliderValue}
  onValueChange={setSliderValue}
  min={0}
  max={100}
/>
```

#### Sonner
Toast notification component.

**Props:**
- `children` (ReactNode): Toast content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Sonner>
  {/* toast notifications */}
</Sonner>
```

#### Switch
Switch/toggle component.

**Props:**
- `checked` (boolean): Switch state
- `onCheckedChange` (function): State change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Switch 
  checked={isEnabled} 
  onCheckedChange={setEnabled} 
/>
```

#### Table
Table component.

**Props:**
- `children` (ReactNode): Table content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Tabs
Tabbed interface component.

**Props:**
- `value` (string): Selected tab value
- `onValueChange` (function): Value change handler
- `children` (ReactNode): Tab content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="details">
    {/* details content */}
  </TabsContent>
  <TabsContent value="settings">
    {/* settings content */}
  </TabsContent>
</Tabs>
```

#### Textarea
Multiline text input component.

**Props:**
- `value` (string): Current value
- `onChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes
- `...props` (TextareaHTMLAttributes): Additional textarea props

**Usage:**
```tsx
<Textarea 
  value={description} 
  onChange={(e) => setDescription(e.target.value)} 
  placeholder="Enter description..."
/>
```

#### TimeZoneDisplay
Time zone display component.

**Props:**
- `timeZone` (string): Time zone identifier
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<TimeZoneDisplay timeZone={userTimeZone} />
```

#### TimeZoneSelector
Time zone selection component.

**Props:**
- `value` (string): Selected time zone
- `onValueChange` (function): Value change handler
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<TimeZoneSelector 
  value={selectedTimeZone}
  onValueChange={setSelectedTimeZone}
/>
```

#### Toast
Toast notification component.

**Props:**
- `children` (ReactNode): Toast content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Toast>
  {/* toast content */}
</Toast>
```

#### Toaster
Toast notification container.

**Props:**
- `children` (ReactNode): Toast notifications
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Toaster>
  {/* toast notifications */}
</Toaster>
```

#### ToggleGroup
Group of toggle buttons.

**Props:**
- `type` (enum): Selection type (single, multiple)
- `value` (string | string[]): Selected value(s)
- `onValueChange` (function): Value change handler
- `children` (ReactNode): Toggle items
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<ToggleGroup type="single" value={selectedView} onValueChange={setSelectedView}>
  <ToggleGroupItem value="day">Day</ToggleGroupItem>
  <ToggleGroupItem value="week">Week</ToggleGroupItem>
  <ToggleGroupItem value="month">Month</ToggleGroupItem>
</ToggleGroup>
```

#### Toggle
Toggle button component.

**Props:**
- `pressed` (boolean): Toggle state
- `onPressedChange` (function): State change handler
- `children` (ReactNode): Button content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Toggle pressed={isToggled} onPressedChange={setToggled}>
  Toggle
</Toggle>
```

#### Tooltip
Tooltip component.

**Props:**
- `content` (ReactNode): Tooltip content
- `children` (ReactNode): Element to attach tooltip to
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<Tooltip content="This is a tooltip">
  <Button>Hover me</Button>
</Tooltip>
```

#### TouchGestures
Touch gesture handling component.

**Props:**
- `children` (ReactNode): Content with touch gestures
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<TouchGestures>
  {/* content with touch gestures */}
</TouchGestures>
```

#### VirtualScroll
Virtual scrolling component.

**Props:**
- `items` (array): Array of items to scroll
- `children` (function): Render function for items
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<VirtualScroll items={eventList} className="h-96">
  {(item) => <EventItem event={item} />}
</VirtualScroll>
```

## Development Components (`components/dev/`)

### AccountSwitcher
Component for switching between test accounts.

**Props:**
- `accounts` (array): Array of available accounts
- `onSwitch` (function): Handler for account switching
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<AccountSwitcher 
  accounts={testAccounts} 
  onSwitch={handleAccountSwitch} 
/>
```

### PersistenceDashboard
Dashboard for monitoring data persistence.

**Props:**
- `data` (object): Persistence data
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<PersistenceDashboard data={persistenceData} />
```

## Notification Components (`components/notifications/`)

### NotificationDropdown
Dropdown for notification management.

**Props:**
- `notifications` (array): Array of notifications
- `onDismiss` (function): Handler for dismissing notifications
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
<NotificationDropdown 
  notifications={userNotifications}
  onDismiss={handleDismissNotification}
/>
```

## Component Usage Patterns

### Form Components
Form components should be used within a form context with proper validation:

```tsx
<form onSubmit={handleSubmit(onSubmit)}>
  <FormControl label="Email" error={errors.email?.message}>
    <Input {...register('email')} type="email" />
  </FormControl>
  {errors.email && <FormError message={errors.email.message} />}
  <FormSubmitButton loading={isSubmitting}>
    Submit
  </FormSubmitButton>
</form>
```

### Data Display Components
Data display components should receive data through props and handle user interactions:

```tsx
<EventList 
  events={events} 
  onEdit={handleEditEvent} 
  onDelete={handleDeleteEvent} 
  onShare={handleShareEvent} 
/>
```

### Modal Components
Modal components should be controlled through state and provide clear open/close mechanisms:

```tsx
const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button variant="outline">Edit Event</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Event</DialogTitle>
    </DialogHeader>
    <EventForm event={editingEvent} onSubmit={handleUpdateEvent} />
  </DialogContent>
</Dialog>
```

### Selection Components
Selection components should provide clear value change handlers:

```tsx
<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    {options.map((option) => (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Component Styling

All components use Tailwind CSS classes for styling. Custom styling can be applied through the `className` prop:

```tsx
<Button className="bg-blue-500 hover:bg-blue-600 text-white">
  Custom Styled Button
</Button>
```

## Accessibility

Components are designed with accessibility in mind:
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance

## Performance Considerations

- Use lazy-loaded components for heavy functionality
- Implement virtual scrolling for large data sets
- Optimize re-renders with React.memo where appropriate
- Use proper loading states for async operations

---

*Last Updated: August 29, 2025*
*Repository Inspector: UI Components Reference v1.0*