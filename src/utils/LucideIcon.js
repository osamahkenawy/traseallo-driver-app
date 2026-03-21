/**
 * LucideIcon — Drop-in replacement for MaterialCommunityIcons
 * Maps old icon names to lucide-react-native components.
 * Usage: <LucideIcon name="arrow-left" size={20} color="#000" />
 */

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  PackageX,
  PackageCheck,
  Camera,
  RefreshCcw,
  CheckCircle,
  CheckCircle2,
  BadgeCheck,
  CheckCheck,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  PenTool,
  Banknote,
  BadgeDollarSign,
  AlertCircle,
  AlertTriangle,
  Info,
  ScanBarcode,
  ScanLine,
  XCircle,
  X,
  MapPin,
  MapPinOff,
  Route,
  Milestone,
  Navigation,
  Clock,
  Timer,
  Phone,
  User,
  UserCheck,
  UserX,
  UserPlus,
  Bell,
  BellRing,
  BellOff,
  Store,
  Truck,
  Wallet,
  Power,
  Signal,
  Coffee,
  PlayCircle,
  Share2,
  Copy,
  Calendar,
  CalendarClock,
  Box,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  ShieldCheck,
  Shield,
  AtSign,
  ArrowDownUp,
  ArrowUpDown,
  LayoutGrid,
  ClipboardList,
  Ban,
  CornerDownLeft,
  Star,
  ThumbsUp,
  Settings,
  Languages,
  FileText,
  Hash,
  MoreHorizontal,
  Hand,
  Wifi,
  WifiOff,
  Hourglass,
  Crosshair,
  Maximize,
  Wine,
  Laptop,
  UtensilsCrossed,
  Shirt,
  Globe,
  CreditCard,
  HelpCircle,
  ListOrdered,
  Headphones,
  TrendingUp,
  Type,
  Zap,
  Home,
  Building2,
  Plus,
  Building,
  MessageCircle,
  MessageSquare,
  Keyboard,
  Circle,
  PackageOpen,
  Trash2,
} from 'lucide-react-native';

const ICON_MAP = {
  // Arrows
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,

  // Packages
  'package-variant': Package,
  'package-variant-closed': Package,
  'package-variant-remove': PackageX,
  'package-variant-closed-check': PackageCheck,

  // Camera
  'camera-outline': Camera,
  'camera-retake-outline': RefreshCcw,

  // Checks
  'check-circle': CheckCircle,
  'check-circle-outline': CheckCircle2,
  'check-decagram': BadgeCheck,
  'check-all': CheckCheck,
  'check': Check,

  // Chevrons
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,

  // Drawing / editing
  'draw': PenTool,

  // Money
  'cash': Banknote,
  'cash-check': BadgeDollarSign,
  'cash-clock': Banknote,

  // Alerts
  'alert-circle-outline': AlertCircle,
  'alert-circle': AlertCircle,
  'alert': AlertTriangle,

  // Info
  'information-outline': Info,

  // Scanner / barcode
  'barcode-scan': ScanBarcode,
  'barcode': ScanLine,

  // Close / cancel
  'close-circle': XCircle,
  'close-circle-outline': XCircle,
  'close': X,
  'cancel': Ban,

  // Map
  'map-marker': MapPin,
  'map-marker-outline': MapPin,
  'map-marker-check-outline': MapPin,
  'map-marker-off-outline': MapPinOff,
  'map-marker-path': Route,
  'map-marker-distance': Milestone,
  'map-marker-radius': MapPin,

  // Navigation
  'navigation-variant': Navigation,
  'navigation-variant-outline': Navigation,
  'navigation-outline': Navigation,

  // Time
  'clock-outline': Clock,
  'clock-fast': Timer,

  // Phone
  'phone': Phone,
  'phone-outline': Phone,

  // User / account
  'account': User,
  'account-outline': User,
  'account-check-outline': UserCheck,
  'account-off-outline': UserX,
  'account-arrow-right-outline': UserPlus,

  // Bell / notifications
  'bell': Bell,
  'bell-outline': Bell,
  'bell-ring-outline': BellRing,
  'bell-check-outline': BellOff,

  // Store
  'store-outline': Store,

  // Truck / delivery
  'truck-delivery': Truck,
  'truck-delivery-outline': Truck,
  'truck-fast-outline': Truck,

  // Wallet
  'wallet-outline': Wallet,

  // Power
  'power-standby': Power,
  'power': Power,

  // Signal
  'signal-variant': Signal,

  // Break
  'coffee-outline': Coffee,

  // Play
  'play-circle-outline': PlayCircle,

  // Share
  'share-variant-outline': Share2,

  // Copy
  'content-copy': Copy,

  // Calendar
  'calendar-outline': Calendar,
  'calendar-clock': CalendarClock,

  // Box
  'cube-outline': Box,

  // Refresh
  'refresh': RefreshCw,

  // Search
  'magnify': Search,

  // Eye
  'eye-outline': Eye,
  'eye-off-outline': EyeOff,

  // Lock
  'lock-outline': Lock,
  'lock-reset': KeyRound,
  'lock-plus-outline': Lock,
  'lock-check-outline': ShieldCheck,

  // Shield
  'shield-check-outline': ShieldCheck,
  'shield-lock-outline': Shield,

  // At
  'at': AtSign,

  // Sort
  'sort-clock-descending-outline': ArrowDownUp,
  'sort-variant': ArrowUpDown,

  // Grid
  'view-grid': LayoutGrid,
  'view-grid-outline': LayoutGrid,

  // Clipboard
  'clipboard-text-clock-outline': ClipboardList,

  // Return
  'keyboard-return': CornerDownLeft,

  // Star
  'star': Star,
  'star-outline': Star,
  'star-check-outline': Star,

  // Thumbs
  'thumb-up-outline': ThumbsUp,

  // Settings
  'cog': Settings,
  'cog-outline': Settings,

  // Language
  'translate': Languages,
  'abjad-arabic': Type,
  'alpha-e-circle-outline': Type,

  // Files
  'file-document-outline': FileText,

  // Numeric
  'numeric': Hash,

  // More
  'dots-horizontal-circle-outline': MoreHorizontal,

  // Hand
  'hand-back-left-outline': Hand,

  // Road
  'road-variant': Route,

  // Wifi
  'wifi': Wifi,
  'wifi-off': WifiOff,

  // Timer
  'timer-sand': Hourglass,

  // GPS
  'crosshairs-gps': Crosshair,

  // Fit
  'fit-to-screen-outline': Maximize,

  // Category icons
  'glass-fragile': Wine,
  'laptop': Laptop,
  'food': UtensilsCrossed,
  'tshirt-crew-outline': Shirt,
  'web': Globe,
  'credit-card-outline': CreditCard,
  'help-circle-outline': HelpCircle,

  // Lists
  'format-list-numbered': ListOrdered,

  // Headset
  'headset': Headphones,

  // Charts
  'trending-up': TrendingUp,
  'chart-line': TrendingUp,

  // Flash
  'flash-outline': Zap,

  // Home
  'home': Home,
  'home-outline': Home,
  'home-city': Building2,
  'home-city-outline': Building2,

  // Plus
  'plus': Plus,

  // City
  'city-variant-outline': Building,

  // Messages
  'whatsapp': MessageCircle,
  'message-text-outline': MessageSquare,

  // Keyboard
  'keyboard-outline': Keyboard,

  // Circle
  'circle': Circle,

  // Misc
  'trash-can-outline': Trash2,

  // Profile / edit
  'steering': Navigation,
  'pencil-outline': PenTool,
  'camera': Camera,
  'content-save-outline': Check,

  // Earnings
  'cash-multiple': Banknote,
  'receipt': FileText,
};

const LucideIcon = ({name, size = 24, color = '#000', strokeWidth, ...rest}) => {
  const IconComponent = ICON_MAP[name] || HelpCircle;
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth || 2} {...rest} />;
};

export default LucideIcon;
