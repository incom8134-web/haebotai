"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import {
  ImagePlus,
  Sparkles,
  FileText,
  Palette,
  AlertTriangle,
  Home,
  Menu as MenuIcon,
  Settings,
} from "lucide-react";
import { Bar, BarChart, XAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FactChip } from "@/components/ui/fact-chip";
import { GroundingLine } from "@/components/ui/grounding-line";
import { VariantCard } from "@/components/ui/variant-card";
import { Dropzone } from "@/components/ui/dropzone";
import { EmptyState } from "@/components/ui/empty-state";
import { CommandPalette } from "@/components/command-palette";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Item, ItemContent, ItemMedia, ItemTitle, ItemDescription } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-hairline py-10 first:pt-0">
      <h2 className="font-mono text-2xs tracking-[0.02em] text-fg-subtle uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const chartData = [
  { month: "1월", value: 186 },
  { month: "2월", value: 305 },
  { month: "3월", value: 237 },
  { month: "4월", value: 273 },
];
const chartConfig = {
  value: { label: "실행 횟수", color: "var(--color-accent)" },
} satisfies ChartConfig;

function FormDemo() {
  const form = useForm({ defaultValues: { email: "" } });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(() => toast.success("검증 통과"))}
        className="flex max-w-sm flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="email"
          rules={{ required: "필수 항목입니다" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl render={<Input placeholder="you@example.com" {...field} />} />
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" className="self-start">
          검증
        </Button>
      </form>
    </Form>
  );
}

export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [selected, setSelected] = useState<0 | 1 | 2>(0);
  const [highlighted, setHighlighted] = useState<string[] | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [facts, setFacts] = useState([
    { ref: "f1", label: "Price", value: "$28" },
    { ref: "f2", label: "Material", value: "Ceramic" },
    { ref: "f3", label: "Color", value: "Sand" },
  ]);
  const [tab, setTab] = useState("logo");

  return (
    <main className="mx-auto flex max-w-4xl flex-col px-6 py-10">
      <h1 className="mb-2 text-3xl font-semibold tracking-[-0.02em] text-fg">
        Kitchen sink
      </h1>
      <p className="mb-4 text-sm text-fg-muted">
        Dev-only. Every primitive, every state.{" "}
        <span className="font-mono text-2xs">/kitchen-sink</span>
      </p>

      <Section title="Colors">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["bg", "bg-bg border border-hairline-str"],
            ["surface", "bg-surface"],
            ["surface-2", "bg-surface-2"],
            ["fg", "bg-fg"],
            ["accent", "bg-accent"],
            ["grounded", "bg-grounded"],
            ["warn", "bg-warn"],
            ["danger", "bg-danger"],
          ].map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-md ${cls}`} />
              <span className="font-mono text-2xs text-fg-muted">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <p className="text-5xl font-semibold tracking-[-0.03em]">64 / Display</p>
          <p className="text-4xl font-semibold tracking-[-0.03em]">48 / Heading</p>
          <p className="text-3xl font-semibold tracking-[-0.02em]">34 / Heading</p>
          <p className="text-2xl font-semibold tracking-[-0.02em]">26 / Heading</p>
          <p className="text-xl">20 / Subhead</p>
          <p className="text-base">14 / Body — the default running text size.</p>
          <p className="text-sm text-fg-muted">13 / UI label</p>
          <p className="text-xs text-fg-muted">12 / UI label small</p>
          <p className="font-mono text-2xs tracking-[0.02em] text-fg-subtle">
            11 / MONO METADATA · 2026-09-14 14:02
          </p>
        </div>
      </Section>

      <Section title="Button / ButtonGroup / Toggle">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" shortcut="⌘↵">
            Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonGroup>
            <Button variant="secondary">왼쪽</Button>
            <Button variant="secondary">가운데</Button>
            <Button variant="secondary">오른쪽</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="secondary" size="icon-sm">
              <Home />
            </Button>
            <ButtonGroupSeparator />
            <Button variant="secondary" size="icon-sm">
              <Settings />
            </Button>
          </ButtonGroup>
          <Toggle aria-label="굵게">B</Toggle>
          <ToggleGroup variant="outline" defaultValue={["left"]}>
            <ToggleGroupItem value="left">좌</ToggleGroupItem>
            <ToggleGroupItem value="center">중</ToggleGroupItem>
            <ToggleGroupItem value="right">우</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <Section title="Kbd">
        <div className="flex items-center gap-2">
          <Kbd>⌘K</Kbd>
          <Kbd>⌘↵</Kbd>
          <Kbd>Esc</Kbd>
        </div>
      </Section>

      <Section title="Card / Badge / Avatar / Tooltip">
        <div className="flex flex-wrap items-center gap-3">
          <Card className="p-4 text-sm">Hairline surface, no shadow.</Card>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Avatar>
            <AvatarFallback className="bg-accent-dim text-accent">해</AvatarFallback>
          </Avatar>
          <Tooltip>
            <TooltipTrigger render={<Button variant="secondary">호버</Button>} />
            <TooltipContent>툴팁 내용입니다</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section title="Breadcrumb / NavigationMenu / Menubar">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/library">라이브러리</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>혁신 로고</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>디자인·브랜딩</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-64 gap-1 p-2">
                  <NavigationMenuLink href="#">혁신 로고</NavigationMenuLink>
                  <NavigationMenuLink href="#">브랜드 모델</NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>파일</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>새 실행</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>내보내기</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>

      <Section title="Alert / AlertDialog / Dialog surfaces">
        <div className="flex flex-col gap-3">
          <Alert>
            <AlertTriangle />
            <AlertTitle>알림</AlertTitle>
            <AlertDescription>기본 알림 메시지입니다.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>파괴적 작업에 대한 경고입니다.</AlertDescription>
          </Alert>
        </div>
        <div className="flex flex-wrap gap-3">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="secondary">삭제하기</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction>삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Sheet>
            <SheetTrigger render={<Button variant="secondary">시트 열기</Button>} />
            <SheetContent>
              <SheetHeader>
                <SheetTitle>시트 제목</SheetTitle>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <Drawer>
            <DrawerTrigger render={<Button variant="secondary">서랍 열기</Button>} />
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>서랍 제목</DrawerTitle>
                <DrawerDescription>서랍 설명입니다.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose render={<Button variant="secondary">닫기</Button>} />
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Popover>
            <PopoverTrigger render={<Button variant="secondary">팝오버</Button>} />
            <PopoverContent>팝오버 내용입니다.</PopoverContent>
          </Popover>

          <HoverCard>
            <HoverCardTrigger render={<Button variant="secondary">호버 카드</Button>} />
            <HoverCardContent>호버 카드 내용입니다.</HoverCardContent>
          </HoverCard>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="secondary">메뉴</Button>} />
            <DropdownMenuContent>
              <DropdownMenuLabel>작업</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>수정</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">삭제</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ContextMenu>
            <ContextMenuTrigger className="flex h-9 items-center rounded-md border border-dashed px-3 text-sm text-fg-muted">
              우클릭
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>복사</ContextMenuItem>
              <ContextMenuItem>붙여넣기</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox id="ks-checkbox" defaultChecked />
            <Label htmlFor="ks-checkbox">체크박스</Label>
          </div>
          <RadioGroup defaultValue="a" className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="a" id="ks-radio-a" />
              <Label htmlFor="ks-radio-a">A</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="b" id="ks-radio-b" />
              <Label htmlFor="ks-radio-b">B</Label>
            </div>
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Switch id="ks-switch" defaultChecked />
            <Label htmlFor="ks-switch">스위치</Label>
          </div>
        </div>
        <Slider defaultValue={[40]} className="max-w-xs" />
        <div className="max-w-xs">
          <Select defaultValue="a">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">옵션 A</SelectItem>
              <SelectItem value="b">옵션 B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea placeholder="여러 줄 입력" className="max-w-xs" />
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
        <Calendar mode="single" className="rounded-lg border border-hairline" />
        <Field className="max-w-xs">
          <FieldLabel>브랜드명</FieldLabel>
          <Input placeholder="해봇 AI" />
          <FieldDescription>실제 상호명을 입력하세요.</FieldDescription>
        </Field>
        <FormDemo />
      </Section>

      <Section title="Item / Empty">
        <Item variant="outline" className="max-w-sm">
          <ItemMedia variant="icon">
            <Sparkles className="size-4" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>혁신 로고</ItemTitle>
            <ItemDescription>제품 사진 한 장으로 로고 시안을 생성합니다.</ItemDescription>
          </ItemContent>
        </Item>
        <Empty className="max-w-sm border border-dashed border-hairline">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImagePlus className="size-5" />
            </EmptyMedia>
            <EmptyTitle>아직 생성된 항목이 없어요</EmptyTitle>
            <EmptyDescription>도구를 실행하면 여기에 표시됩니다.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">시작하기</Button>
          </EmptyContent>
        </Empty>
      </Section>

      <Section title="Accordion / Collapsible / Tabs">
        <Accordion defaultValue={["a"]} className="max-w-sm">
          <AccordionItem value="a">
            <AccordionTrigger>첫 번째 항목</AccordionTrigger>
            <AccordionContent>첫 번째 항목의 내용입니다.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>두 번째 항목</AccordionTrigger>
            <AccordionContent>두 번째 항목의 내용입니다.</AccordionContent>
          </AccordionItem>
        </Accordion>

        <Collapsible className="max-w-sm">
          <CollapsibleTrigger render={<Button variant="secondary" size="sm">더보기</Button>} />
          <CollapsibleContent className="mt-2 text-sm text-fg-muted">
            접었다 펼치는 내용입니다.
          </CollapsibleContent>
        </Collapsible>

        <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="max-w-sm">
          <TabsList>
            <TabsTrigger value="logo">로고</TabsTrigger>
            <TabsTrigger value="model">브랜드 모델</TabsTrigger>
          </TabsList>
          <TabsContent value="logo" className="text-sm text-fg-muted">
            로고 탭 내용
          </TabsContent>
          <TabsContent value="model" className="text-sm text-fg-muted">
            브랜드 모델 탭 내용
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Progress / Skeleton / Spinner">
        <Progress value={65} className="max-w-xs" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Spinner />
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>도구</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>크레딧</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>혁신 로고</TableCell>
              <TableCell>
                <Badge variant="secondary">완료</Badge>
              </TableCell>
              <TableCell>12</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>브랜드 모델</TableCell>
              <TableCell>
                <Badge>진행 중</Badge>
              </TableCell>
              <TableCell>45</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Carousel / Chart">
        <Carousel className="mx-auto w-full max-w-xs">
          <CarouselContent>
            {[1, 2, 3].map((n) => (
              <CarouselItem key={n}>
                <div className="flex h-24 items-center justify-center rounded-md border border-hairline text-2xl">
                  {n}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        <ChartContainer config={chartConfig} className="h-48 w-full max-w-lg">
          <BarChart data={chartData}>
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <ChartTooltip content={ChartTooltipContent} />
            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          </BarChart>
        </ChartContainer>
      </Section>

      <Section title="Resizable">
        <ResizablePanelGroup className="h-32 max-w-lg rounded-lg border border-hairline">
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">
              왼쪽
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">
              오른쪽
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Section>

      <Section title="Sidebar">
        <SidebarProvider className="h-64 max-w-lg overflow-hidden rounded-lg border border-hairline">
          <Sidebar collapsible="none">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>메뉴</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Home />
                      홈
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive>
                      <Sparkles />
                      도구
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="flex h-full items-center gap-2 p-4">
              <SidebarTrigger>
                <MenuIcon />
              </SidebarTrigger>
              <span className="text-sm text-fg-muted">본문 영역</span>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </Section>

      <Section title="FactChip — hover a chip; hover a grounding line">
        <div className="flex flex-wrap gap-2">
          {facts.map((f, i) => (
            <FactChip
              key={f.ref}
              ref_={f.ref}
              label={f.label}
              value={f.value}
              index={i}
              highlighted={highlighted?.includes(f.ref) ?? false}
              onEdit={(patch) =>
                setFacts((prev) =>
                  prev.map((x) => (x.ref === f.ref ? { ...x, ...patch } : x)),
                )
              }
              onDelete={() => setFacts((prev) => prev.filter((x) => x.ref !== f.ref))}
            />
          ))}
        </div>
        <GroundingLine refs={["f1", "f3"]} onHoverRefs={setHighlighted} />
      </Section>

      <Section title="VariantCard">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <VariantCard
              key={i}
              groupId="kitchen-sink-variants"
              caption={`Variant ${i + 1} caption text goes here, grounded in the facts above.`}
              refs={i === 1 ? ["f2"] : ["f1", "f3"]}
              selected={selected === i}
              dimmed={selected !== i}
              onSelect={() => setSelected(i as 0 | 1 | 2)}
              onHoverRefs={setHighlighted}
            />
          ))}
        </div>
      </Section>

      <Section title="Dropzone">
        <div className="grid gap-3 sm:grid-cols-2">
          <Dropzone onFiles={() => toast.success("파일을 받았어요")} />
          <Dropzone onFiles={() => {}} error="지원하지 않는 파일 형식입니다" />
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={ImagePlus}
          title="아직 생성된 이미지가 없어요"
          description="설명을 입력하고 생성 버튼을 눌러보세요."
          action={{ label: "시작하기", onClick: () => toast("시작!") }}
        />
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success("실제 9 크레딧 사용")}>
            Success
          </Button>
          <Button variant="secondary" onClick={() => toast.error("생성에 실패했어요")}>
            Error
          </Button>
          <Button variant="secondary" onClick={() => toast("3개 사실 추출됨")}>
            Default
          </Button>
        </div>
      </Section>

      <Section title="Command palette">
        <Button variant="secondary" shortcut="⌘K" onClick={() => setPaletteOpen(true)}>
          Open palette
        </Button>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          groups={[
            {
              heading: "디자인·브랜딩",
              items: [
                { id: "logo", label: "혁신 로고", icon: Palette, onSelect: () => toast("logo") },
                { id: "image", label: "이미지 생성", icon: Sparkles, onSelect: () => toast("image") },
              ],
            },
            {
              heading: "문서·사업 운영",
              items: [
                { id: "proposal", label: "제안서", icon: FileText, onSelect: () => toast("proposal") },
              ],
            },
          ]}
        />
      </Section>
    </main>
  );
}
