function StatCard({
  label = "Invoiced",
  value = 1_437_500,
  /** pass a string to control formatting yourself, e.g. "$88.5k" */
  display,
  caption,
  delta,
  deltaTone = "up",
  icon,
  iconTone = "neutral",
  trend,
  trendTone = 1,
  trendSmooth = false,
  trendAnimate = FORMIC_CONFIG.motion,
  trendKind = "line",
  trendSplit,
  trendNames,
  layout = "label-first",
  align = "start",
  ring,
  chart: chartProp,
  period,
  keyTone = 1,
  size = "md",
  className = "",
}

function BarChart({
  labels = CHART_MONTHS,
  series = BAR_SERIES_DEFAULT,
  variant = "grouped",
  /** index of the column to emphasise; the rest drop to a tint */
  highlight,
  height = 168,
  fill = false,
  showValues = true,
  valuePosition = "top",
  axis = false,
  thin = false,
  horizontal = false,
  format = compact,
  animate = FORMIC_CONFIG.motion,
  className = "",
}

function LineChart({
  labels = CHART_MONTHS,
  series = LINE_SERIES_DEFAULT,
  area = true,
  points = true,
  height = 150,
  fill = false,
  animate = FORMIC_CONFIG.motion,
  legend = true,
  curve = "linear",
  backdrop = false,
  guides = false,
  axis = false,
  floor = true,
  format = compact,
  endMarker = false,
  tooltip = "point",
  className = "",
}

function DonutChart({
  value = 500,
  max = 720,
  label = "Visitors",
  color = 4,
  size = 116,
  segments,
  legend = true,
  center,
  format = compact,
  animate = FORMIC_CONFIG.motion,
  className = "",
}

function ChartLegend({ series }

function ChartTip({ tip }

function DataTable({
  columns,
  rows,
  selectable = false,
  selected,
  defaultSelected = [],
  onSelectedChange,
  actions,
  toolbar,
  pageSize,
  total,
  page,
  defaultPage = 1,
  onPageChange,
  empty = <EmptyState size="sm" />,
  label = "Records",
  onRowClick,
  className = "",
}

function StatusCell({ tone = "neutral", children }

function StatStrip({ items = DEFAULT_STRIP, className = "" }