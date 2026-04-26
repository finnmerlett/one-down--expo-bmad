# gluestack-ui v3 — Available Components Reference

> **Source:** Verified against [gluestack/gluestack-ui GitHub repo](https://github.com/gluestack/gluestack-ui/tree/main/src/components/ui) (April 2026)
>
> **Usage policy:** Only copy components into `components/ui/` when actually needed by a story. Do NOT pre-install the full set. This file is the reference for what's available.

## Core UI Components

| Component | Description |
|-----------|-------------|
| Accordion | Collapsible sections with headers and content |
| Actionsheet | Bottom slide-up action menu |
| Alert | Inline alert/notification banners |
| AlertDialog | Modal confirmation dialogs with actions |
| Avatar | User/entity image with fallback initials |
| Badge | Small status/tag indicators |
| BottomSheet | Draggable bottom panel overlay |
| Box | Basic layout container (like `View` with styling) |
| Button | Pressable action buttons with variants/sizes |
| Card | Content container with optional header/footer |
| Center | Centres children horizontally and vertically |
| Checkbox | Toggle checkboxes with labels |
| Divider | Horizontal/vertical line separator |
| Drawer | Side panel overlay navigation |
| Fab | Floating action button |
| FormControl | Form field wrapper with label, helper text, error |
| Grid | CSS Grid-like layout container |
| Heading | Semantic heading text (h1–h6) |
| HStack | Horizontal flex row |
| Icon | Icon container with Lucide integration |
| Image | Optimised image display |
| Input | Text input field |
| Link | Pressable link text |
| Menu | Dropdown/context menu |
| Modal | Centered overlay dialog |
| Popover | Positioned tooltip-like overlay with content |
| Portal | Renders children outside parent hierarchy |
| Pressable | Generic pressable container |
| Progress | Progress bar indicator |
| Radio | Radio button group |
| Select | Dropdown select picker |
| Skeleton | Loading placeholder animations |
| Slider | Range slider input |
| Spinner | Loading spinner |
| Switch | On/off toggle switch |
| Table | Data table with rows/columns |
| Text | Styled text with variants |
| Textarea | Multi-line text input |
| Toast | Temporary notification messages |
| Tooltip | Hover/press tooltip |
| VStack | Vertical flex column |

## React Native Primitive Wrappers

These wrap standard RN components with gluestack styling support:

| Component | Description |
|-----------|-------------|
| FlatList | Performant scrollable list |
| GluestackUIProvider | Theme/config provider (required at app root) |
| ImageBackground | Image as background container |
| InputAccessoryView | iOS keyboard accessory view |
| KeyboardAvoidingView | Adjusts layout when keyboard appears |
| RefreshControl | Pull-to-refresh indicator |
| SafeAreaView | Safe area insets wrapper |
| ScrollView | Scrollable container |
| SectionList | Grouped scrollable list |
| StatusBar | Status bar configuration |
| View | Basic view container |
| VirtualizedList | Low-level virtualised list |

## Installation

Copy individual components as needed:

```bash
npx gluestack-ui add <component-name>
```

Examples:
```bash
npx gluestack-ui add button
npx gluestack-ui add card
npx gluestack-ui add toast
```
