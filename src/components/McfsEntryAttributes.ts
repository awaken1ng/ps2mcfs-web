import { type McEntryInfo } from 'lib/mcfs'
import {
  isEntryReadable, isEntryWriteable, isEntryExecutale, isEntryProtected,
  isEntryHidden, isPs1Save, isPocketStationSave,
} from 'lib/ps2mc'
import { computed, h } from 'vue'

type Props = {
  entry: McEntryInfo
}

export default function McfsEntryAttributes(
  props: Props,
) {
  const attributes = computed(() => {
    const attrs = []

    const entry = props.entry
    if (isEntryReadable(entry))     attrs.push({ shorthand: 'R',   tooltip: 'Readable' })
    if (isEntryWriteable(entry))    attrs.push({ shorthand: 'W',   tooltip: "Writeable" })
    if (isEntryExecutale(entry))    attrs.push({ shorthand: 'X',   tooltip: "Executable" })
    if (isEntryProtected(entry))    attrs.push({ shorthand: 'P',   tooltip: "Copy protected" })
    if (isEntryHidden(entry))       attrs.push({ shorthand: 'H',   tooltip: "Hidden" })
    if (isPs1Save(entry))           attrs.push({ shorthand: 'PS1', tooltip: "PlayStation 1" })
    if (isPocketStationSave(entry)) attrs.push({ shorthand: 'PS',  tooltip: "PocketStation" })

    return attrs
  })

  const attributesKebab = computed(() => {
    const spans = attributes.value
      .flatMap(({ shorthand, tooltip }) => {
        const attribute = h('span', { title: tooltip, textContent: shorthand })
        const dash = h('span', '-')
        return [attribute, dash]
      })

    spans.pop() // remove the trailing <span>-</span>

    return spans
  })

  return h('div', attributesKebab.value)
}

McfsEntryAttributes.props = {
  entry: {
    required: true
  }
}
