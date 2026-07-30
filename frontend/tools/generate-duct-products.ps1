$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputFile = Join-Path $projectRoot 'src\data\duct-products.generated.ts'
$drawingDir = Join-Path $projectRoot 'public\photo\duct-products\drawings'
New-Item -ItemType Directory -Force -Path $drawingDir | Out-Null

$items = @(
  @{ family='round'; slug='kruglyj-pryamoj-uchastok'; name='Прямой участок'; source='https://svok.com/equipment/pryamoj-uchastok-2/'; photo='/photo/duct-products/round/Pryamoy_uchastok.png' },
  @{ family='round'; slug='kruglyj-otvod'; name='Отвод'; source='https://svok.com/equipment/otvod/'; photo='/photo/duct-products/round/otvod.png' },
  @{ family='round'; slug='kruglyj-perehod'; name='Переход'; source='https://svok.com/equipment/perehod/'; photo='/photo/duct-products/round/perehod.png' },
  @{ family='round'; slug='kruglyj-trojnik'; name='Тройник'; source='https://svok.com/equipment/trojnik/'; photo='/photo/duct-products/round/troynik.png' },
  @{ family='round'; slug='kruglaya-krestovina'; name='Крестовина'; source='https://svok.com/equipment/krestovina/'; photo='/photo/duct-products/round/krestovina.png' },
  @{ family='round'; slug='kruglyj-nippel-mufta'; name='Ниппель / муфта'; source='https://svok.com/equipment/nippel-mufta/'; photo='/photo/duct-products/round/nippel_mufta.png' },
  @{ family='round'; slug='kruglaya-vrezka-v-kruglyj-kanal'; name='Врезка в круглый канал'; source='https://svok.com/equipment/vrezka-v-kruglyj-kanal/'; photo='/photo/duct-products/round/vrezka_v_krugly_kanal.png' },
  @{ family='round'; slug='kruglaya-vrezka-v-pryamougolnyj-kanal'; name='Врезка в прямоугольный канал'; source='https://svok.com/equipment/vrezka-v-pryamougolnyj-kanal/'; photo='/photo/duct-products/round/vrezka_v_pryamoug_kanal.png' },
  @{ family='round'; slug='kruglaya-zaglushka'; name='Заглушка'; source='https://svok.com/equipment/zaglushka/'; photo='/photo/duct-products/round/zaglushka.png' },
  @{ family='round'; slug='kruglaya-utka'; name='Утка'; source='https://svok.com/equipment/utka/'; photo='/photo/duct-products/round/utka.png' },

  @{ family='rect'; slug='pryamougolnyj-pryamoj-uchastok'; name='Прямой участок'; source='https://svok.com/equipment/pryamoj-uchastok-3/'; photo='/photo/duct-products/rect/pryamoug_uchastok.png' },
  @{ family='rect'; slug='pryamougolnyj-perehod-na-krugloe-sechenie'; name='Переход на круглое сечение'; source='https://svok.com/equipment/perehod-na-krugloe-sechenie/'; photo='/photo/duct-products/rect/perehod_na_krugl_secheniye.png' },
  @{ family='rect'; slug='pryamougolnyj-perehod-na-pryamougolnoe-sechenie'; name='Переход на прямоугольное сечение'; source='https://svok.com/equipment/perehod-na-pryamougolnoe-sechenie/'; photo='/photo/duct-products/rect/perehod_na_pryamoug_secheniye.png' },
  @{ family='rect'; slug='pryamougolnyj-trojnik'; name='Тройник'; source='https://svok.com/equipment/trojnik-2/'; photo='/photo/duct-products/rect/troynik.png' },
  @{ family='rect'; slug='pryamougolnyj-otvod'; name='Отвод'; source='https://svok.com/equipment/otvod-2/'; photo='/photo/duct-products/rect/otvod.png' },
  @{ family='rect'; slug='pryamougolnaya-krestovina'; name='Крестовина'; source='https://svok.com/equipment/krestovina-2/'; photo='/photo/duct-products/rect/krestovina.png' },
  @{ family='rect'; slug='pryamougolnaya-vrezka-v-pryamougolnyj-kanal'; name='Врезка в прямоугольный канал'; source='https://svok.com/equipment/vrezka-v-pryamougolnyj-kanal-2/'; photo='/photo/duct-products/rect/vrezka_v_pryamoug_kanal.png' },
  @{ family='rect'; slug='pryamougolnaya-vrezka-v-kruglyj-kanal'; name='Врезка в круглый канал'; source='https://svok.com/equipment/vrezka-v-kruglyj-kanal-2/'; photo='/photo/duct-products/rect/vrezka_v_krugli_kanal.png' },
  @{ family='rect'; slug='adapter-dlya-ventilyacionnyh-reshetok'; name='Адаптер для вентиляционных решеток'; source='https://svok.com/equipment/adapter-dlya-ventilyaczionnyh-reshetok/'; photo='/photo/duct-products/rect/adapter_dlya_vent_reshetok.png' },
  @{ family='rect'; slug='pryamougolnaya-zaglushka'; name='Заглушка'; source='https://svok.com/equipment/zaglushka-2/'; photo='/photo/duct-products/rect/zaglushka.png' },
  @{ family='rect'; slug='pryamougolnaya-utka'; name='Утка'; source='https://svok.com/equipment/utka-2/'; photo='/photo/duct-products/rect/utka.png' },

  @{ family='flanges'; slug='flanec-pryamougolnyj'; name='Фланец прямоугольный'; source='https://svok.com/equipment/flanecz-pryamougolnyj/'; photo='/photo/duct-products/flanges/flanec_pryamoug.png' },
  @{ family='flanges'; slug='flanec-kruglyj'; name='Фланец круглый'; source='https://svok.com/equipment/flanecz-kruglyj/'; photo='/photo/duct-products/flanges/duct-flanges.png' }
)

function Strip-Tags([string]$value) {
  $without = [regex]::Replace($value, '<[^>]+>', ' ')
  return [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($without, '\s+', ' ')).Trim())
}

function Sanitize-Table([string]$html) {
  $clean = [regex]::Replace($html, '(?is)\s(?:style|class|width|height|border|cellpadding|cellspacing|background)=(?:"[^"]*"|''[^'']*''|[^\s>]+)', '')
  $clean = [regex]::Replace($clean, '(?is)\s(?:onclick|onload|onerror)=(?:"[^"]*"|''[^'']*'')', '')
  return $clean.Trim()
}

function Escape-Ts([string]$value) {
  return $value.Replace('\', '\\').Replace('`', '\`').Replace('${', '\${')
}

function Summary-For([hashtable]$item) {
  if ($item.family -eq 'round') {
    return "$($item.name) — элемент сети воздуховодов круглого сечения. Геометрия, размеры и толщина материала выбираются по проекту и приведённым ниже техническим данным."
  }
  if ($item.family -eq 'rect') {
    return "$($item.name) — элемент сети воздуховодов прямоугольного сечения. Исполнение и присоединительные размеры подбираются по проекту и техническим таблицам."
  }
  return "$($item.name) применяется для соединения элементов вентиляционной сети. Размер и исполнение фланца выбираются под соответствующее сечение воздуховода."
}

$rows = New-Object System.Collections.Generic.List[string]
foreach ($item in $items) {
  Write-Host "Fetch $($item.source)"
  $response = Invoke-WebRequest -Uri $item.source -UseBasicParsing -TimeoutSec 45
  $html = $response.Content
  $start = $html.IndexOf('<h2 id="opisanie">', [System.StringComparison]::OrdinalIgnoreCase)
  if ($start -lt 0) { throw "Description block not found: $($item.source)" }
  $next = $html.IndexOf('<div class="section', $start + 20, [System.StringComparison]::OrdinalIgnoreCase)
  if ($next -lt 0) { $next = $html.Length }
  $segment = $html.Substring($start, $next - $start)
  $segment = [regex]::Replace($segment, '(?is)<!--.*?-->', '')

  $blocks = New-Object System.Collections.Generic.List[string]
  $seenImages = @{}
  $imageIndex = 0
  $matches = [regex]::Matches($segment, '(?is)<h3\b[^>]*>.*?</h3>|<table\b[^>]*>.*?</table>|<img\b[^>]*(?:src|data-src)=["''](?<src>[^"'']+)["''][^>]*>')
  foreach ($match in $matches) {
    $token = $match.Value
    if ($token -match '^(?is)<h3') {
      $title = Strip-Tags $token
      if ($title) { $blocks.Add("<h3>$([System.Net.WebUtility]::HtmlEncode($title))</h3>") }
      continue
    }
    if ($token -match '^(?is)<table') {
      $blocks.Add((Sanitize-Table $token))
      continue
    }
    $url = $match.Groups['src'].Value
    if (-not $url -or $seenImages.ContainsKey($url)) { continue }
    $seenImages[$url] = $true
    $imageIndex++
    $uri = [Uri]$url
    $ext = [IO.Path]::GetExtension($uri.AbsolutePath)
    if (-not $ext -or $ext.Length -gt 5) { $ext = '.png' }
    $fileName = "$($item.slug)-$('{0:D2}' -f $imageIndex)$ext"
    $dest = Join-Path $drawingDir $fileName
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 45 -OutFile $dest
    $encodedName = [System.Net.WebUtility]::HtmlEncode($item.name)
    $blocks.Add(('<figure class="duct-drawing"><img src="/photo/duct-products/drawings/{0}" alt="Технический чертёж — {1}" loading="lazy" /></figure>' -f $fileName, $encodedName))
  }

  if ($blocks.Count -eq 0) { throw "No technical blocks extracted: $($item.source)" }
  $familyTitle = if ($item.family -eq 'round') { 'Круглые воздуховоды' } elseif ($item.family -eq 'rect') { 'Прямоугольные воздуховоды' } else { 'Фланцы для вентиляции' }
  $content = ($blocks -join "`n")
  $escapedContent = Escape-Ts $content
  $tick = [char]96
  $summary = Summary-For $item
  $advantages = if ($item.family -eq 'flanges') {
    '["Подбор под сечение воздуховода", "Оцинкованная или нержавеющая сталь", "Изготовление по проекту"]'
  } else {
    '["Изготовление по проекту", "Оцинкованная или нержавеющая сталь", "Геометрия и размеры по техническим данным"]'
  }
  $rows.Add(@"
  {
    slug: "$($item.slug)",
    name: "$($item.name)",
    marking: "$familyTitle",
    group: "ducts",
    hideInCatalog: true,
    hideInMenu: true,
    blurb: "$(Escape-Ts $summary)",
    advantages: $advantages,
    photo: "$($item.photo)",
    ductFamily: "$($item.family)",
    sourceUrl: "$($item.source)",
    contentHtml: $tick$escapedContent$tick,
  }
"@)
}

$header = @'
// Generated from the three official SVOK category pages on 2026-07-21.
// Main product images are user-provided; only drawings and technical tables are derived from source pages.
import type { Product } from "./catalog";

export const DUCT_PRODUCTS: Product[] = [
'@
$footer = @'
];
'@
[IO.File]::WriteAllText($outputFile, $header + ($rows -join ',') + $footer, [Text.UTF8Encoding]::new($false))
Write-Host "Generated $outputFile ($($items.Count) products)"
