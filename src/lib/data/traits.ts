/**
 * The 37 traits of the lead arm (31 TRY traits and 6 hydraulic traits),
 * grouped for the panel. Ids are those of the web store's meta.json; the data
 * source supplies the authoritative units and bin edges, so the units here are
 * only a fallback for the preview build.
 */
export interface Trait {
  id: string;
  name: string;
  unit: string;
  group: string;
  hydraulic?: boolean;
}

const g = (group: string, items: [string, string, string][], hydraulic = false): Trait[] =>
  items.map(([id, name, unit]) => ({ id, name, unit, group, hydraulic }));

export const TRAITS: Trait[] = [
  ...g('Size and structure', [
    ['X3106', 'Plant height', 'm'],
    ['X21', 'Stem diameter', 'm'],
    ['X4', 'Stem specific density', 'g cm⁻³'],
    ['X6', 'Rooting depth', 'm'],
    ['X169', 'Conduit density', 'mm⁻²'],
    ['X281', 'Conduit diameter', 'µm'],
    ['X282', 'Conduit element length', 'µm']
  ]),
  ...g('Leaf economics', [
    ['X3117', 'SLA', 'mm² mg⁻¹'],
    ['X47', 'LDMC', 'g g⁻¹'],
    ['X14', 'Leaf N (mass)', 'mg g⁻¹'],
    ['X50', 'Leaf N (area)', 'g m⁻²'],
    ['X15', 'Leaf P', 'mg g⁻¹'],
    ['X13', 'Leaf C', 'mg g⁻¹'],
    ['X146', 'Leaf C/N', 'g g⁻¹'],
    ['X78', 'Leaf δ¹⁵N', '‰'],
    ['X46', 'Leaf thickness', 'mm'],
    ['X3120', 'Leaf water content', 'g g⁻¹']
  ]),
  ...g('Leaf size', [
    ['X3114', 'Leaf area', 'mm²'],
    ['X144', 'Leaf length', 'mm'],
    ['X145', 'Leaf width', 'mm'],
    ['X55', 'Leaf dry mass', 'mg'],
    ['X163', 'Leaf fresh mass', 'g']
  ]),
  ...g('Seeds and reproduction', [
    ['X26', 'Seed mass', 'mg'],
    ['X27', 'Seed length', 'mm'],
    ['X138', 'Seed number', ''],
    ['X237', 'Dispersal unit length', 'mm'],
    ['X95', 'Germination rate', '%']
  ]),
  ...g('Wood and roots', [
    ['X289', 'Wood fiber length', 'µm'],
    ['X297', 'Wood ray density', 'mm⁻¹'],
    ['X614', 'Specific fine root length', 'm g⁻¹'],
    ['X1080', 'Specific root length', 'm g⁻¹']
  ]),
  ...g(
    'Hydraulics (woody plants only)',
    [
      ['P12', 'P12', 'MPa'],
      ['P50', 'P50', 'MPa'],
      ['P88', 'P88', 'MPa'],
      ['gsmax', 'gsmax', 'mmol m⁻² s⁻¹'],
      ['rdmax', 'Max. rooting depth', 'm'],
      ['WUE', 'WUE', '']
    ],
    true
  )
];

export const GROUPS = [...new Set(TRAITS.map((t) => t.group))];
