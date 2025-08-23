'use client'

import * as React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrivacyLevelSelector, PrivacyLevel } from '@/components/ui/privacy-level-selector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDown, Calendar, CalendarClock, Check, ChevronDown, ChevronUp, Edit, Filter, Globe, Info, Lock, Search, Shield, User, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type PermissionObjectType = 'contact' | 'group' | 'event' | 'category'

export type PermissionTarget = {
  id: string
  name: string
  type: PermissionObjectType
  color?: string
  inherited?: boolean
  inheritedFrom?: {
    id: string
    name: string
    type: PermissionObjectType
  }
}

export type PermissionItem = {
  target: PermissionTarget
  permissions: {
    [key: string]: PrivacyLevel
  }
  overrides?: {
    [key: string]: {
      level: PrivacyLevel
      inheritedFrom: {
        id: string
        name: string
        type: PermissionObjectType
      }
    }
  }
  default: PrivacyLevel
}

export type PermissionCategory = {
  id: string
  name: string
  description?: string
  permissions: string[]
  children?: PermissionCategory[]
}

export type ConflictResolutionStrategy = 'most_restrictive' | 'most_permissive' | 'explicit_wins'

export interface PermissionEditorProps {
  items: PermissionItem[]
  categories: PermissionCategory[]
  conflictStrategy: ConflictResolutionStrategy
  onChange: (items: PermissionItem[]) => void
  onStrategyChange?: (strategy: ConflictResolutionStrategy) => void
  className?: string
}

export function PermissionEditor({
  items,
  categories,
  conflictStrategy,
  onChange,
  onStrategyChange,
  className
}: PermissionEditorProps) {
  const [activeTab, setActiveTab] = React.useState('matrix')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterType, setFilterType] = React.useState<PermissionObjectType | 'all'>('all')
  const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({})
  
  const flattenedPermissions = React.useMemo(() => {
    const result: string[] = []
    
    const traverse = (category: PermissionCategory) => {
      category.permissions.forEach(perm => result.push(perm))
      category.children?.forEach(traverse)
    }
    
    categories.forEach(traverse)
    return result
  }, [categories])
  
  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.target.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === 'all' || item.target.type === filterType
      return matchesSearch && matchesType
    })
  }, [items, searchTerm, filterType])
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }
  
  const isCategoryExpanded = (categoryId: string) => {
    return expandedCategories[categoryId] !== false // Default to expanded
  }
  
  const handlePermissionChange = (itemIndex: number, permissionKey: string, level: PrivacyLevel) => {
    const newItems = [...items]
    
    // Update the permission
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      permissions: {
        ...newItems[itemIndex].permissions,
        [permissionKey]: level
      }
    }
    
    onChange(newItems)
  }
  
  const handleDefaultChange = (itemIndex: number, level: PrivacyLevel) => {
    const newItems = [...items]
    
    // Update the default permission
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      default: level
    }
    
    onChange(newItems)
  }
  
  const renderCategoryRows = (category: PermissionCategory, level = 0) => {
    const isExpanded = isCategoryExpanded(category.id)
    
    return (
      <React.Fragment key={category.id}>
        <TableRow className="group hover:bg-accent/30">
          <TableCell 
            colSpan={filteredItems.length + 1} 
            className={cn(
              "font-medium cursor-pointer",
              level > 0 && "pl-6"
            )}
            onClick={() => toggleCategory(category.id)}
          >
            <div className="flex items-center">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              <span>{category.name}</span>
              {category.description && (
                <div title={category.description}>
                  <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
        
        {isExpanded && (
          <>
            {/* Render the permissions for this category */}
            {category.permissions.map(permission => (
              <TableRow key={permission} className="hover:bg-muted/50">
                <TableCell className={cn("pl-8", level > 0 && "pl-12")}>
                  {permission}
                </TableCell>
                {filteredItems.map((item, index) => (
                  <TableCell key={`${item.target.id}-${permission}`}>
                    <PrivacyLevelSelector
                      value={item.permissions[permission] || item.default}
                      onChange={(level) => handlePermissionChange(index, permission, level)}
                      showBadge={true}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
            
            {/* Render child categories */}
            {category.children?.map(child => renderCategoryRows(child, level + 1))}
          </>
        )}
      </React.Fragment>
    )
  }
  
  const getTargetIcon = (type: PermissionObjectType) => {
    switch (type) {
      case 'contact':
        return <User className="h-4 w-4" />
      case 'group':
        return <Users className="h-4 w-4" />
      case 'event':
        return <Calendar className="h-4 w-4" />
      case 'category':
        return <CalendarClock className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }
  
  return (
    <div className={className}>
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Permission Matrix
            </div>
            {onStrategyChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <span className="mr-2">Conflict Resolution:</span>
                    <Badge variant="secondary">
                      {conflictStrategy === 'most_restrictive' && 'Most Restrictive'}
                      {conflictStrategy === 'most_permissive' && 'Most Permissive'}
                      {conflictStrategy === 'explicit_wins' && 'Explicit Wins'}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Conflict Resolution Strategy</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onStrategyChange('most_restrictive')}
                    className={cn(
                      "flex items-center justify-between",
                      conflictStrategy === 'most_restrictive' && "font-bold"
                    )}
                  >
                    <span>Most Restrictive</span>
                    {conflictStrategy === 'most_restrictive' && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onStrategyChange('most_permissive')}
                    className={cn(
                      "flex items-center justify-between",
                      conflictStrategy === 'most_permissive' && "font-bold"
                    )}
                  >
                    <span>Most Permissive</span>
                    {conflictStrategy === 'most_permissive' && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onStrategyChange('explicit_wins')}
                    className={cn(
                      "flex items-center justify-between",
                      conflictStrategy === 'explicit_wins' && "font-bold"
                    )}
                  >
                    <span>Explicit Wins</span>
                    {conflictStrategy === 'explicit_wins' && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-muted-foreground">
                    Controls how permissions are resolved when multiple rules apply
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardTitle>
          <CardDescription>
            Control who can see what in your calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Tabs for different views */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="matrix">Matrix View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-2 mt-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setFilterType('all')}
                      className={filterType === 'all' ? "font-bold" : ""}
                    >
                      All Types
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setFilterType('contact')}
                      className={filterType === 'contact' ? "font-bold" : ""}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Contacts
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setFilterType('group')}
                      className={filterType === 'group' ? "font-bold" : ""}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Groups
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <TabsContent value="matrix" className="pt-4">
                {filteredItems.length > 0 ? (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permission</TableHead>
                          {filteredItems.map((item) => (
                            <TableHead key={item.target.id}>
                              <div className="flex flex-col items-center space-y-1">
                                <div 
                                  className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    item.target.type === 'contact' && "bg-blue-100",
                                    item.target.type === 'group' && "bg-green-100",
                                    item.target.type === 'event' && "bg-purple-100",
                                    item.target.type === 'category' && "bg-amber-100",
                                  )}
                                >
                                  {getTargetIcon(item.target.type)}
                                </div>
                                <span className="font-medium text-xs text-center truncate max-w-[100px]">
                                  {item.target.name}
                                </span>
                                {item.target.inherited && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Inherited
                                  </Badge>
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Default row */}
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-medium">
                            Default Access
                          </TableCell>
                          {filteredItems.map((item, index) => (
                            <TableCell key={`${item.target.id}-default`}>
                              <PrivacyLevelSelector
                                value={item.default}
                                onChange={(level) => handleDefaultChange(index, level)}
                                showBadge={true}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                        
                        {/* Category-based permission rows */}
                        {categories.map(category => renderCategoryRows(category))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-muted/20">
                    <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-medium">No items found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filterType !== 'all' 
                        ? "Try adjusting your search or filters" 
                        : "Add contacts or groups to manage permissions"}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="list" className="pt-4">
                {filteredItems.length > 0 ? (
                  <div className="space-y-4">
                    {filteredItems.map((item, itemIndex) => (
                      <Card key={item.target.id} className="border shadow-sm">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div 
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center mr-2",
                                  item.target.type === 'contact' && "bg-blue-100",
                                  item.target.type === 'group' && "bg-green-100",
                                  item.target.type === 'event' && "bg-purple-100",
                                  item.target.type === 'category' && "bg-amber-100",
                                )}
                              >
                                {getTargetIcon(item.target.type)}
                              </div>
                              <CardTitle className="text-base">{item.target.name}</CardTitle>
                              {item.target.inherited && (
                                <Badge variant="outline" className="ml-2">
                                  Inherited
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary">
                              {item.target.type.charAt(0).toUpperCase() + item.target.type.slice(1)}
                            </Badge>
                          </div>
                          <CardDescription className="flex justify-between items-center">
                            <span>Default access:</span>
                            <PrivacyLevelSelector
                              value={item.default}
                              onChange={(level) => handleDefaultChange(itemIndex, level)}
                              showBadge={true}
                            />
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {flattenedPermissions.map(permission => (
                              <div 
                                key={permission} 
                                className="flex justify-between items-center p-2 rounded-md hover:bg-accent/20"
                              >
                                <span className="text-sm">{permission}</span>
                                <PrivacyLevelSelector
                                  value={item.permissions[permission] || item.default}
                                  onChange={(level) => handlePermissionChange(itemIndex, permission, level)}
                                  showBadge={true}
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-muted/20">
                    <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-medium">No items found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filterType !== 'all' 
                        ? "Try adjusting your search or filters" 
                        : "Add contacts or groups to manage permissions"}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
