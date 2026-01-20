'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Music, Users, Calendar, Settings, Menu, ArrowUpRight } from 'lucide-react'

const features = [
  {
    title: 'Multi-tenant Management',
    href: '#features',
    description: 'Manage multiple studios from a single dashboard with seamless switching.',
    icon: Settings,
  },
  {
    title: 'Session Tracking',
    href: '#features',
    description: 'Track and manage all your studio sessions in one organized calendar.',
    icon: Calendar,
  },
  {
    title: 'Team Collaboration',
    href: '#features',
    description: 'Invite team members and collaborate on studio operations.',
    icon: Users,
  },
  {
    title: 'Gear Management',
    href: '#features',
    description: 'Keep track of all your studio equipment and gear inventory.',
    icon: Music,
  },
]

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full flex h-16 items-center justify-between px-4 md:px-8 lg:px-32">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 min-w-0">
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <path d="M2 4C2 3.44772 2.44772 3 3 3L12 4L21 3C21.5523 3 22 3.44772 22 4L21 12L22 20C22 20.5523 21.5523 21 21 21L12 20L3 21C2.44772 21 2 20.5523 2 20L3 12L2 4Z" fill="white"/>
            <path d="M11 3C11.5523 3 12 3.44771 12 4C12 3.44771 12.4477 3 13 3H21C21.5523 3 22 3.44771 22 4V11C22 11.5523 21.5523 12 21 12C21.5523 12 22 12.4477 22 13V20C22 20.5523 21.5523 21 21 21H13C12.4477 21 12 20.5523 12 20C12 20.5523 11.5523 21 11 21H3C2.44771 21 2 20.5523 2 20V13C2 12.4477 2.44772 12 3 12C2.44771 12 2 11.5523 2 11V4C2 3.44771 2.44771 3 3 3H11ZM3 20H5V17.5H4.5C4.22386 17.5 4 17.2762 4 17V13H3V20ZM6 20H8V17.5H7.5C7.22385 17.5 7 17.2762 7 17V13H6V20ZM9 20H11V17.5H10.5C10.2239 17.5 10 17.2762 10 17V13H9V20ZM13.5 13C13.2239 13 13 13.2239 13 13.5V14.5H21V13.5C21 13.2239 20.7761 13 20.5 13H13.5ZM13 10.5C13 10.7761 13.2239 11 13.5 11H20.5C20.7761 11 21 10.7761 21 10.5V6.5H13V10.5ZM3.5 4C3.22386 4 3 4.22386 3 4.5V5.5H11V4.5C11 4.22386 10.7761 4 10.5 4H3.5ZM13.5 4C13.2239 4 13 4.22386 13 4.5V5.5H21V4.5C21 4.22386 20.7761 4 20.5 4H13.5ZM11 12C11.5523 12 12 12.4477 12 13C12 12.4477 12.4477 12 13 12C12.4477 12 12 11.5523 12 11C12 11.5523 11.5523 12 11 12Z" fill="black"/>
          </svg>
          <span className="text-xl font-bold">studioside</span>
        </Link>

        {/* Desktop Navigation Menu */}
        <NavigationMenu>
          <NavigationMenuList className="hidden md:flex">
            <NavigationMenuItem>
              <NavigationMenuTrigger>Features</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {features.map((feature) => {
                    const Icon = feature.icon
                    return (
                      <li key={feature.title}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={feature.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <div className="text-sm font-medium leading-none">
                                {feature.title}
                              </div>
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {feature.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    )
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="#pricing">Pricing</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="#about">About</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 mt-6">
              <div className="space-y-2">
                <p className="px-3 text-sm font-semibold text-muted-foreground">Features</p>
                {features.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <Link
                      key={feature.title}
                      href={feature.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{feature.title}</div>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <Link
                href="#pricing"
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Pricing
              </Link>
              <Link
                href="#about"
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                About
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href="/login">Get Started <ArrowUpRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/login">Get Started <ArrowUpRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

