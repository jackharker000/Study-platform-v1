/* ── Pre-written study notes ────────────────────────────────────────
   Keyed by: NOTES[subjectId][topicName or subtopicName] = HTML string
   HTML supports: <h2>, <h3>, <p>, <ul><li>, <div class="formula">, <div class="tip">
*/

const NOTES = {

  /* ════════════════════════════════════════════════════════════════
     IGCSE BIOLOGY (igcse_bio)
  ════════════════════════════════════════════════════════════════ */
  igcse_bio: {

    'Animal & plant cells': `
<h2>Animal & Plant Cells</h2>
<h3>Shared organelles (both cell types)</h3>
<ul>
  <li><strong>Cell membrane</strong> — controls what enters and leaves the cell</li>
  <li><strong>Cytoplasm</strong> — gel-like fluid; site of many metabolic reactions</li>
  <li><strong>Nucleus</strong> — contains DNA; controls cell activities</li>
  <li><strong>Mitochondria</strong> — site of aerobic respiration; produces ATP</li>
  <li><strong>Ribosomes</strong> — site of protein synthesis</li>
</ul>
<h3>Plant cell only</h3>
<ul>
  <li><strong>Cell wall</strong> (cellulose) — provides rigid support</li>
  <li><strong>Chloroplasts</strong> — contain chlorophyll; site of photosynthesis</li>
  <li><strong>Permanent vacuole</strong> — filled with cell sap; helps maintain turgor</li>
</ul>
<div class="tip">Exam tip: Always state the function when asked to "describe" an organelle, not just name it.</div>`,

    'Diffusion, osmosis & active transport': `
<h2>Diffusion, Osmosis & Active Transport</h2>
<h3>Diffusion</h3>
<p>Net movement of particles from an area of <strong>high concentration</strong> to <strong>low concentration</strong> — down a concentration gradient. No energy required.</p>
<p>Rate increases with: larger surface area, steeper gradient, higher temperature, shorter diffusion distance.</p>
<h3>Osmosis</h3>
<p>Special case of diffusion — movement of <strong>water molecules</strong> through a <strong>partially permeable membrane</strong> from a region of higher water potential (dilute solution) to lower water potential (concentrated solution).</p>
<ul>
  <li>Turgid cell — fully inflated with water (plant cells); gives support</li>
  <li>Plasmolysed cell — water leaves; membrane pulls away from wall</li>
  <li>Crenated animal cell — shrinks in concentrated solution</li>
</ul>
<h3>Active Transport</h3>
<p>Movement of particles <strong>against</strong> the concentration gradient (low → high). Requires <strong>ATP energy</strong> and carrier proteins. Example: uptake of mineral ions by root hair cells.</p>
<div class="tip">Exam tip: Active transport always needs energy; osmosis and diffusion do not.</div>`,

    'Enzyme action': `
<h2>Enzymes</h2>
<p>Enzymes are <strong>biological catalysts</strong> — proteins that speed up metabolic reactions without being used up.</p>
<h3>Lock and Key Model</h3>
<p>The substrate fits exactly into the enzyme's <strong>active site</strong> (complementary shape) forming an enzyme-substrate complex. Products are released and the enzyme is unchanged.</p>
<h3>Induced Fit Model</h3>
<p>The active site is flexible and changes shape slightly to accommodate the substrate — a better description of real enzymes.</p>
<h3>Factors affecting enzyme activity</h3>
<ul>
  <li><strong>Temperature</strong>: increasing temp increases rate up to the optimum (~37°C for human enzymes). Above optimum, H-bonds break, active site changes shape → denaturation (irreversible)</li>
  <li><strong>pH</strong>: each enzyme has an optimum pH. Extremes alter ionic bonds in the protein structure → denaturation</li>
  <li><strong>Substrate concentration</strong>: more substrate → more collisions → faster rate, until all active sites are occupied (saturation)</li>
  <li><strong>Enzyme concentration</strong>: more enzyme → more active sites → faster rate (if substrate is not limiting)</li>
</ul>
<div class="formula">Rate of reaction = 1 / time taken</div>
<div class="tip">Exam tip: Denaturation is permanent — "slowing down" implies reversible (temperature), "denaturation" is irreversible.</div>`,

    'Aerobic respiration': `
<h2>Aerobic Respiration</h2>
<p>The process by which cells release energy (ATP) from glucose using oxygen.</p>
<div class="formula">C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O   (+ ATP)</div>
<h3>Where it happens</h3>
<p>Mainly in the <strong>mitochondria</strong> (also cytoplasm for glycolysis stage).</p>
<h3>Uses of ATP energy</h3>
<ul>
  <li>Muscle contraction</li>
  <li>Active transport</li>
  <li>Protein synthesis</li>
  <li>Maintaining body temperature</li>
  <li>Cell division</li>
</ul>`,

    'Anaerobic respiration': `
<h2>Anaerobic Respiration</h2>
<p>Respiration <strong>without oxygen</strong>. Releases less ATP than aerobic respiration.</p>
<h3>In animals (and humans)</h3>
<div class="formula">Glucose → Lactic acid  (+ small amount of ATP)</div>
<p>Lactic acid builds up in muscles → fatigue. The oxygen debt is repaid when lactic acid is broken down after exercise.</p>
<h3>In yeast (and plants)</h3>
<div class="formula">Glucose → Ethanol + Carbon dioxide  (+ small amount of ATP)</div>
<p>This is used in <strong>fermentation</strong> for bread (CO₂ causes rising) and brewing (ethanol produced).</p>
<div class="tip">Exam tip: Animals produce lactic acid; yeast produces ethanol + CO₂.</div>`,

    'Heart structure & function': `
<h2>The Heart</h2>
<h3>Structure</h3>
<ul>
  <li><strong>4 chambers</strong>: left and right atria (receive blood), left and right ventricles (pump blood out)</li>
  <li><strong>Left side</strong>: pumps oxygenated blood to the body (systemic circulation)</li>
  <li><strong>Right side</strong>: pumps deoxygenated blood to the lungs (pulmonary circulation)</li>
  <li><strong>Valves</strong>: atrioventricular (between atria and ventricles) and semilunar (at artery exits) — prevent backflow</li>
  <li><strong>Left ventricle</strong> has a thicker wall — pumps blood the full length of the body</li>
</ul>
<h3>Blood vessels</h3>
<ul>
  <li><strong>Arteries</strong> — carry blood away from heart; thick muscular walls; high pressure</li>
  <li><strong>Veins</strong> — carry blood to heart; valves prevent backflow; low pressure</li>
  <li><strong>Capillaries</strong> — one cell thick; site of gas and nutrient exchange</li>
</ul>`,

    'Photosynthesis': `
<h2>Photosynthesis</h2>
<div class="formula">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂  (light energy required)</div>
<h3>Where it happens</h3>
<p>In the <strong>chloroplasts</strong> — specifically on the thylakoid membranes and in the stroma. Chlorophyll absorbs mainly red and blue light.</p>
<h3>Limiting factors</h3>
<ul>
  <li><strong>Light intensity</strong> — more light → faster rate (up to saturation)</li>
  <li><strong>CO₂ concentration</strong> — more CO₂ → faster rate (up to saturation)</li>
  <li><strong>Temperature</strong> — higher temp → faster rate (up to optimum, then enzymes denature)</li>
  <li><strong>Water</strong> — rarely limiting in practice</li>
</ul>
<div class="tip">Exam tip: On a graph, the factor that is changing on the x-axis is the limiting factor — the other factors must be constant.</div>`,

    'DNA & genes': `
<h2>DNA & Genes</h2>
<h3>DNA structure</h3>
<ul>
  <li>Double helix made of two strands</li>
  <li>Each strand is a chain of <strong>nucleotides</strong> (sugar + phosphate + base)</li>
  <li><strong>Complementary base pairs</strong>: A–T and C–G, held by hydrogen bonds</li>
</ul>
<h3>Gene</h3>
<p>A section of DNA that codes for a specific protein (sequence of amino acids).</p>
<h3>Chromosomes</h3>
<p>Humans have <strong>46 chromosomes</strong> in 23 pairs. Sex chromosomes: XX (female), XY (male).</p>
<h3>Monohybrid inheritance</h3>
<p>Use Punnett squares. Dominant allele (capital letter) masks recessive (lower case).</p>
<ul>
  <li>Homozygous: two identical alleles (AA or aa)</li>
  <li>Heterozygous: two different alleles (Aa)</li>
  <li>Genotype: the alleles present; Phenotype: the observable characteristic</li>
</ul>`,

    'Natural selection': `
<h2>Natural Selection & Evolution</h2>
<h3>Darwin's mechanism</h3>
<ul>
  <li>Organisms <strong>overproduce</strong> offspring — more born than can survive</li>
  <li>There is <strong>variation</strong> within a population (due to mutation and sexual reproduction)</li>
  <li>There is <strong>competition</strong> for limited resources (food, space, mates)</li>
  <li>Individuals best adapted to the environment are more likely to <strong>survive and reproduce</strong></li>
  <li>Favourable alleles are passed on → over generations, population changes</li>
</ul>
<h3>Evidence for evolution</h3>
<ul>
  <li>Fossil record</li>
  <li>DNA similarities between species</li>
  <li>Observed evolution (antibiotic resistance in bacteria)</li>
  <li>Comparative anatomy (homologous structures)</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE CHEMISTRY (igcse_chem)
  ════════════════════════════════════════════════════════════════ */
  igcse_chem: {

    'Moles': `
<h2>The Mole & Stoichiometry</h2>
<div class="formula">Moles = Mass (g) ÷ Molar Mass (g/mol)</div>
<div class="formula">Moles = Volume (dm³) × Concentration (mol/dm³)</div>
<div class="formula">Moles of gas at RTP = Volume (dm³) ÷ 24</div>
<h3>Steps for calculations</h3>
<ul>
  <li>1. Write a balanced equation</li>
  <li>2. Find moles of the known substance</li>
  <li>3. Use the ratio from the equation</li>
  <li>4. Convert to required units (mass, volume, concentration)</li>
</ul>
<h3>Percentage yield</h3>
<div class="formula">% yield = (actual yield / theoretical yield) × 100</div>
<h3>Atom economy</h3>
<div class="formula">Atom economy = (M of desired product / total M of all products) × 100</div>`,

    'Ionic bonding': `
<h2>Ionic Bonding</h2>
<p>Formed between a <strong>metal</strong> and a <strong>non-metal</strong>. Electrons are <strong>transferred</strong> from metal to non-metal.</p>
<h3>Formation</h3>
<ul>
  <li>Metal loses electrons → forms positive cation</li>
  <li>Non-metal gains electrons → forms negative anion</li>
  <li>Both achieve noble gas electron configuration</li>
  <li>Electrostatic attraction between oppositely charged ions = ionic bond</li>
</ul>
<h3>Properties of ionic compounds</h3>
<ul>
  <li><strong>High melting/boiling points</strong> — giant lattice; many strong forces to break</li>
  <li><strong>Conduct when molten or dissolved</strong> — ions free to move; not in solid state</li>
  <li><strong>Brittle</strong> — repulsion when layers shift</li>
  <li>Many are <strong>soluble in water</strong></li>
</ul>`,

    'Covalent bonding': `
<h2>Covalent Bonding</h2>
<p>Formed between <strong>non-metals</strong>. Electrons are <strong>shared</strong> between atoms.</p>
<h3>Simple molecular structures</h3>
<p>E.g. H₂O, CO₂, CH₄. Low melting/boiling points — only weak intermolecular forces to overcome. Do not conduct electricity (no free ions/electrons).</p>
<h3>Giant covalent structures</h3>
<ul>
  <li><strong>Diamond</strong> — each C bonded to 4 C atoms; very hard; high mp; does not conduct</li>
  <li><strong>Graphite</strong> — each C bonded to 3; layers; delocalised electrons → conducts; soft/slippery (layers slide)</li>
  <li><strong>Silicon dioxide (SiO₂)</strong> — high mp; does not conduct</li>
</ul>`,

    'Factors affecting rate': `
<h2>Rates of Reaction</h2>
<p>Reaction rate = how fast reactants are converted to products.</p>
<div class="formula">Rate = 1 / time  OR  Rate = change in quantity / time</div>
<h3>Factors</h3>
<ul>
  <li><strong>Temperature</strong> — more energy → more frequent collisions AND more particles have activation energy → rate increases</li>
  <li><strong>Concentration</strong> — more particles per unit volume → more frequent collisions</li>
  <li><strong>Pressure</strong> (gases only) — same as concentration effect</li>
  <li><strong>Surface area</strong> — smaller particle size → larger surface area → more collisions</li>
  <li><strong>Catalyst</strong> — provides alternative lower-energy pathway → more particles have activation energy</li>
</ul>
<h3>Collision theory</h3>
<p>Reactions occur when particles collide with <strong>sufficient energy</strong> (≥ activation energy) and the <strong>correct orientation</strong>.</p>
<div class="tip">Exam tip: A catalyst lowers activation energy — it does NOT increase temperature or average kinetic energy.</div>`,

    'Alkanes': `
<h2>Alkanes</h2>
<p>Saturated hydrocarbons — contain only C–C single bonds. General formula: <strong>CₙH₂ₙ₊₂</strong></p>
<ul>
  <li>Methane (CH₄), Ethane (C₂H₆), Propane (C₃H₈), Butane (C₄H₁₀)</li>
</ul>
<h3>Properties</h3>
<ul>
  <li>Non-polar; do not react with acids/bases</li>
  <li>Burn in oxygen: <strong>complete combustion</strong> → CO₂ + H₂O; <strong>incomplete</strong> → CO + H₂O (+ soot)</li>
  <li>Substitution reaction with halogens (UV light)</li>
</ul>`,

    'Alkenes & addition reactions': `
<h2>Alkenes</h2>
<p>Unsaturated hydrocarbons — contain a C=C double bond. General formula: <strong>CₙH₂ₙ</strong></p>
<h3>Addition reactions</h3>
<ul>
  <li><strong>Hydrogenation</strong>: alkene + H₂ → alkane (nickel catalyst, 150°C)</li>
  <li><strong>Halogenation</strong>: alkene + Br₂ → dibromoalkane (bromine water decolorises — test for C=C)</li>
  <li><strong>Hydration</strong>: alkene + H₂O → alcohol (steam, phosphoric acid catalyst, 300°C)</li>
  <li><strong>Polymerisation</strong>: many alkene monomers → polymer chain</li>
</ul>
<div class="tip">Exam tip: Bromine water turning from orange/brown to colourless confirms presence of a C=C double bond.</div>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE PHYSICS (igcse_phys)
  ════════════════════════════════════════════════════════════════ */
  igcse_phys: {

    'Speed, velocity & acceleration': `
<h2>Motion</h2>
<div class="formula">Speed (m/s) = Distance (m) ÷ Time (s)</div>
<div class="formula">Acceleration (m/s²) = Change in velocity (m/s) ÷ Time (s)</div>
<h3>Distance-time graphs</h3>
<ul>
  <li>Gradient = speed</li>
  <li>Horizontal line = stationary</li>
  <li>Straight line = constant speed</li>
  <li>Curved line = changing speed (acceleration)</li>
</ul>
<h3>Velocity-time graphs</h3>
<ul>
  <li>Gradient = acceleration</li>
  <li>Area under graph = distance travelled</li>
  <li>Horizontal line = constant velocity</li>
  <li>Line sloping down = deceleration</li>
</ul>`,

    "Newton's laws": `
<h2>Newton's Laws of Motion</h2>
<h3>First Law</h3>
<p>An object remains at rest or moves with constant velocity unless acted on by a <strong>resultant force</strong>.</p>
<h3>Second Law</h3>
<div class="formula">F = m × a  (Resultant force = mass × acceleration)</div>
<p>Unit: N (Newton) = kg·m/s²</p>
<h3>Third Law</h3>
<p>Every action has an equal and opposite reaction. The two forces act on <strong>different objects</strong>.</p>
<h3>Weight vs Mass</h3>
<div class="formula">Weight (N) = mass (kg) × gravitational field strength (N/kg)</div>
<p>On Earth, g ≈ 10 N/kg. Weight is a force; mass is the amount of matter.</p>`,

    'Current, voltage & resistance': `
<h2>Electricity</h2>
<div class="formula">V = I × R  (Ohm's Law: Voltage = Current × Resistance)</div>
<div class="formula">P = I × V  (Power = Current × Voltage)</div>
<div class="formula">E = P × t  (Energy = Power × time)</div>
<h3>Series circuits</h3>
<ul>
  <li>Same current everywhere</li>
  <li>Voltages add up to supply voltage</li>
  <li>Resistances add: R_total = R₁ + R₂</li>
</ul>
<h3>Parallel circuits</h3>
<ul>
  <li>Same voltage across each branch</li>
  <li>Currents add: I_total = I₁ + I₂</li>
  <li>1/R_total = 1/R₁ + 1/R₂</li>
</ul>
<div class="tip">Exam tip: In a parallel circuit, adding more resistors decreases the total resistance.</div>`,

    'Radioactive emissions': `
<h2>Radioactivity</h2>
<h3>Types of radiation</h3>
<ul>
  <li><strong>Alpha (α)</strong> — helium nucleus (2p + 2n); stopped by paper; most ionising; deflected by fields</li>
  <li><strong>Beta (β)</strong> — fast electron; stopped by 3mm aluminium; moderately ionising</li>
  <li><strong>Gamma (γ)</strong> — electromagnetic wave; stopped by thick lead; least ionising; no charge</li>
</ul>
<h3>Half-life</h3>
<p>Time for half the radioactive atoms in a sample to decay.</p>
<div class="formula">N = N₀ × (½)^(t/t½)</div>
<h3>Uses</h3>
<ul>
  <li>α — smoke detectors</li>
  <li>β — thickness gauges; treating thyroid cancer</li>
  <li>γ — medical imaging (PET scans), sterilisation, cancer treatment</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE MATHS (igcse_maths)
  ════════════════════════════════════════════════════════════════ */
  igcse_maths: {

    'Quadratics': `
<h2>Quadratic Equations</h2>
<p>Form: <strong>ax² + bx + c = 0</strong></p>
<h3>Methods to solve</h3>
<ul>
  <li><strong>Factorising</strong>: find two numbers that multiply to ac and add to b</li>
  <li><strong>Completing the square</strong>: rewrite as (x + p)² = q, then solve</li>
  <li><strong>Quadratic formula</strong>:</li>
</ul>
<div class="formula">x = (−b ± √(b²−4ac)) / 2a</div>
<h3>Discriminant</h3>
<div class="formula">Δ = b² − 4ac</div>
<ul>
  <li>Δ > 0: two distinct real roots</li>
  <li>Δ = 0: one repeated root</li>
  <li>Δ < 0: no real roots (complex)</li>
</ul>`,

    'Circle theorems': `
<h2>Circle Theorems</h2>
<ul>
  <li>Angle at centre = 2 × angle at circumference (same arc)</li>
  <li>Angles in the same segment are equal</li>
  <li>Angle in a semicircle = 90°</li>
  <li>Opposite angles in a cyclic quadrilateral add to 180°</li>
  <li>Tangent is perpendicular to radius at the point of contact</li>
  <li>Tangents from an external point are equal in length</li>
  <li>Alternate segment theorem: angle between tangent and chord = angle in alternate segment</li>
</ul>
<div class="tip">Exam tip: Always state the theorem you are using as a reason in your working.</div>`,

    'Probability': `
<h2>Probability</h2>
<div class="formula">P(event) = number of favourable outcomes / total number of outcomes</div>
<h3>Key rules</h3>
<ul>
  <li><strong>Mutually exclusive</strong>: P(A or B) = P(A) + P(B)</li>
  <li><strong>Independent events</strong>: P(A and B) = P(A) × P(B)</li>
  <li><strong>Complementary</strong>: P(not A) = 1 − P(A)</li>
</ul>
<h3>Tree diagrams</h3>
<p>Multiply along branches (AND), add between branches (OR). Always check all probabilities on each set of branches sum to 1.</p>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE ECONOMICS (igcse_econ)
  ════════════════════════════════════════════════════════════════ */
  igcse_econ: {

    'Scarcity & choice': `
<h2>The Basic Economic Problem</h2>
<p><strong>Scarcity</strong>: unlimited wants but limited resources. This forces individuals, firms, and governments to make <strong>choices</strong>.</p>
<h3>Opportunity cost</h3>
<p>The next best alternative foregone when a choice is made.</p>
<p>Example: a government spends $1bn on hospitals — the opportunity cost is whatever else that money could have funded (e.g. roads).</p>
<h3>Factors of production</h3>
<ul>
  <li><strong>Land</strong> — natural resources</li>
  <li><strong>Labour</strong> — human effort</li>
  <li><strong>Capital</strong> — man-made resources used in production</li>
  <li><strong>Enterprise</strong> — risk-taking, organisation of other factors</li>
</ul>`,

    'Elasticities (PED, PES, YED, XED)': `
<h2>Elasticities</h2>
<h3>Price Elasticity of Demand (PED)</h3>
<div class="formula">PED = %ΔQd / %ΔP</div>
<ul>
  <li>|PED| > 1: elastic (luxury, many substitutes, non-essential)</li>
  <li>|PED| < 1: inelastic (necessity, few substitutes, addictive)</li>
</ul>
<h3>Income Elasticity of Demand (YED)</h3>
<div class="formula">YED = %ΔQd / %ΔY (income)</div>
<ul>
  <li>Positive YED: normal good</li>
  <li>Negative YED: inferior good</li>
  <li>YED > 1: luxury good</li>
</ul>
<h3>Price Elasticity of Supply (PES)</h3>
<div class="formula">PES = %ΔQs / %ΔP</div>
<ul>
  <li>PES > 1: elastic supply (easy to increase production)</li>
  <li>PES < 1: inelastic supply (hard to increase — time, perishable, etc.)</li>
</ul>
<h3>Cross Elasticity of Demand (XED)</h3>
<div class="formula">XED = %ΔQd of A / %ΔP of B</div>
<ul>
  <li>Positive: substitutes (e.g. Pepsi and Coke)</li>
  <li>Negative: complements (e.g. cars and petrol)</li>
</ul>`,

    'Inflation': `
<h2>Inflation</h2>
<p>A sustained rise in the general price level. Measured by CPI (Consumer Price Index).</p>
<h3>Causes</h3>
<ul>
  <li><strong>Demand-pull</strong>: excess aggregate demand (consumer boom, government spending, low interest rates)</li>
  <li><strong>Cost-push</strong>: rising costs of production (wages, raw materials, oil prices)</li>
  <li><strong>Monetary</strong>: too much money in circulation (quantity theory: MV = PQ)</li>
</ul>
<h3>Effects</h3>
<ul>
  <li>Erodes purchasing power of money</li>
  <li>Hurts savers; benefits debtors (real value of debt falls)</li>
  <li>Creates uncertainty; discourages investment</li>
  <li>Reduces international competitiveness if higher than rivals</li>
</ul>
<h3>Policies</h3>
<ul>
  <li>Monetary: raise interest rates (reduces borrowing and spending)</li>
  <li>Fiscal: reduce government spending or raise taxes</li>
  <li>Supply-side: improve productive capacity to lower costs</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     AS PHYSICS (as_phys)
  ════════════════════════════════════════════════════════════════ */
  as_phys: {

    'SI units & dimensions': `
<h2>Physical Quantities & SI Units</h2>
<h3>Base SI units</h3>
<ul>
  <li>Mass — kilogram (kg)</li>
  <li>Length — metre (m)</li>
  <li>Time — second (s)</li>
  <li>Current — ampere (A)</li>
  <li>Temperature — kelvin (K)</li>
  <li>Amount of substance — mole (mol)</li>
  <li>Luminous intensity — candela (cd)</li>
</ul>
<h3>Dimensional analysis</h3>
<p>Check equations are homogeneous — dimensions must balance on both sides.</p>
<p>Example: F = ma → [kg·m·s⁻²] = [kg][m·s⁻²] ✓</p>`,

    'Uncertainty & error analysis': `
<h2>Uncertainties & Errors</h2>
<h3>Types of error</h3>
<ul>
  <li><strong>Random error</strong>: unpredictable variation; reduced by repeating and averaging</li>
  <li><strong>Systematic error</strong>: consistent bias (e.g. zero error, calibration fault); not reduced by repeating</li>
  <li><strong>Parallax error</strong>: reading a scale at wrong angle</li>
</ul>
<h3>Uncertainty calculations</h3>
<div class="formula">Absolute uncertainty: ±Δx</div>
<div class="formula">Fractional uncertainty: Δx/x</div>
<div class="formula">Percentage uncertainty: (Δx/x) × 100%</div>
<h3>Combining uncertainties</h3>
<ul>
  <li>Add/subtract quantities: ADD absolute uncertainties</li>
  <li>Multiply/divide: ADD percentage uncertainties</li>
  <li>Power n: MULTIPLY percentage uncertainty by n</li>
</ul>`,

    'SUVAT & projectile motion': `
<h2>Kinematics — SUVAT Equations</h2>
<p>Valid for <strong>uniform acceleration</strong> only.</p>
<div class="formula">v = u + at</div>
<div class="formula">s = ut + ½at²</div>
<div class="formula">v² = u² + 2as</div>
<div class="formula">s = ½(u + v)t</div>
<p>s = displacement, u = initial velocity, v = final velocity, a = acceleration, t = time</p>
<h3>Projectile motion</h3>
<ul>
  <li>Horizontal and vertical components are <strong>independent</strong></li>
  <li>Horizontal: constant velocity (a = 0), s = ut</li>
  <li>Vertical: acceleration = g = 9.81 m/s² downward</li>
  <li>At maximum height, vertical velocity = 0</li>
</ul>`,

    'Wave properties & equations': `
<h2>Waves</h2>
<div class="formula">v = fλ  (wave speed = frequency × wavelength)</div>
<div class="formula">T = 1/f  (period = 1 / frequency)</div>
<h3>Wave types</h3>
<ul>
  <li><strong>Transverse</strong>: oscillations perpendicular to direction of travel (light, water waves)</li>
  <li><strong>Longitudinal</strong>: oscillations parallel to direction of travel (sound, P-waves)</li>
</ul>
<h3>Superposition & interference</h3>
<ul>
  <li>Constructive interference: path difference = nλ (in phase)</li>
  <li>Destructive interference: path difference = (n + ½)λ (out of phase)</li>
</ul>
<h3>Diffraction grating</h3>
<div class="formula">d sin θ = nλ</div>
<p>d = slit spacing, n = order, θ = angle to principal maximum</p>`,

    'Resistance & resistivity': `
<h2>Resistance & Resistivity</h2>
<div class="formula">V = IR  (Ohm's law)</div>
<div class="formula">R = ρL/A  (ρ = resistivity, L = length, A = cross-sectional area)</div>
<h3>I–V characteristics</h3>
<ul>
  <li><strong>Ohmic conductor</strong>: straight line through origin</li>
  <li><strong>Filament lamp</strong>: curve — resistance increases with temperature</li>
  <li><strong>Diode</strong>: conducts in one direction only; sharp turn-on voltage</li>
  <li><strong>NTC thermistor</strong>: resistance decreases as temperature rises</li>
  <li><strong>LDR</strong>: resistance decreases as light intensity increases</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     AS MATHS (as_maths)
  ════════════════════════════════════════════════════════════════ */
  as_maths: {

    'Quadratics': `
<h2>Quadratics (AS Pure 1)</h2>
<h3>Completing the square</h3>
<p>Write ax² + bx + c in the form a(x + p)² + q to find the vertex and sketch the curve.</p>
<div class="formula">x² + bx = (x + b/2)² − (b/2)²</div>
<h3>Discriminant</h3>
<div class="formula">b² − 4ac</div>
<ul>
  <li>> 0: two real roots</li>
  <li>= 0: one repeated root (tangent to x-axis)</li>
  <li>< 0: no real roots</li>
</ul>
<h3>Inequalities with quadratics</h3>
<p>Sketch the parabola. For x² − 5x + 6 > 0, roots are x = 2,3: solution is x < 2 or x > 3 (outside the roots for positive leading coefficient).</p>`,

    'Differentiation': `
<h2>Differentiation (AS Pure 1)</h2>
<div class="formula">d/dx (xⁿ) = nxⁿ⁻¹</div>
<div class="formula">d/dx (axⁿ) = anxⁿ⁻¹</div>
<h3>Applications</h3>
<ul>
  <li><strong>Gradient</strong> of curve at a point: substitute x-value into dy/dx</li>
  <li><strong>Stationary points</strong>: set dy/dx = 0 and solve</li>
  <li><strong>Nature</strong>: second derivative d²y/dx² — positive = min, negative = max, zero = check</li>
  <li><strong>Increasing/decreasing</strong>: dy/dx > 0 (increasing), dy/dx < 0 (decreasing)</li>
  <li><strong>Tangent</strong>: gradient m = dy/dx at point; equation y − y₁ = m(x − x₁)</li>
  <li><strong>Normal</strong>: gradient = −1/m</li>
</ul>`,

    'Integration': `
<h2>Integration (AS Pure 1)</h2>
<div class="formula">∫xⁿ dx = xⁿ⁺¹/(n+1) + c  (n ≠ −1)</div>
<h3>Definite integrals</h3>
<div class="formula">∫[a to b] f(x) dx = [F(x)]ᵃᵇ = F(b) − F(a)</div>
<p>Gives the area between the curve and the x-axis (negative if below x-axis).</p>
<h3>Area between curves</h3>
<p>Area = ∫[a to b] (upper − lower) dx. Sketch first to identify which is upper.</p>`,

    'Binomial expansion': `
<h2>Binomial Expansion</h2>
<div class="formula">(a + b)ⁿ = Σ C(n,r) aⁿ⁻ʳ bʳ  for r = 0,1,...,n</div>
<div class="formula">C(n,r) = n! / (r!(n−r)!)  — "n choose r"</div>
<h3>Pascal's triangle</h3>
<p>Row n gives coefficients. Row 4: 1 4 6 4 1</p>
<h3>Key points</h3>
<ul>
  <li>There are n+1 terms in the expansion</li>
  <li>Powers of a decrease, powers of b increase</li>
  <li>Use (1 + x)ⁿ expansion for approximations</li>
</ul>`,

    'Normal distribution': `
<h2>Normal Distribution (Statistics 1)</h2>
<p>Notation: X ~ N(μ, σ²) where μ = mean, σ² = variance</p>
<h3>Properties</h3>
<ul>
  <li>Symmetric bell curve about the mean</li>
  <li>Mean = Median = Mode</li>
  <li>~68% within 1σ, ~95% within 2σ, ~99.7% within 3σ</li>
</ul>
<h3>Standardising</h3>
<div class="formula">Z = (X − μ) / σ   where Z ~ N(0, 1)</div>
<p>Use the standard normal table (Φ) to find probabilities.</p>
<div class="tip">Exam tip: P(X < a) = Φ(z). For P(X > a) = 1 − Φ(z). For P(a < X < b) = Φ(z₂) − Φ(z₁).</div>`,
  },

  /* ════════════════════════════════════════════════════════════════
     AS ECONOMICS (as_econ)
  ════════════════════════════════════════════════════════════════ */
  as_econ: {

    'Demand & supply analysis': `
<h2>Demand & Supply</h2>
<h3>Law of Demand</h3>
<p>As price rises, quantity demanded falls — inverse relationship. Demand curve slopes downward.</p>
<h3>Shifts in demand (not movement along)</h3>
<ul>
  <li>Income changes (normal/inferior goods)</li>
  <li>Price of related goods (substitutes/complements)</li>
  <li>Tastes and preferences</li>
  <li>Population changes</li>
  <li>Expectations</li>
</ul>
<h3>Law of Supply</h3>
<p>As price rises, quantity supplied rises — positive relationship. Supply curve slopes upward.</p>
<h3>Shifts in supply</h3>
<ul>
  <li>Costs of production</li>
  <li>Technology improvements</li>
  <li>Number of producers</li>
  <li>Government taxes/subsidies</li>
  <li>Weather (agricultural goods)</li>
</ul>
<h3>Market equilibrium</h3>
<p>Where demand = supply. Price adjusts to clear the market.</p>`,

    'Market structures': `
<h2>Market Structures</h2>
<h3>Perfect Competition</h3>
<ul>
  <li>Many buyers and sellers; homogeneous products; free entry/exit; perfect information</li>
  <li>Firms are price takers (P = MC in long run); zero economic profit long-run</li>
</ul>
<h3>Monopoly</h3>
<ul>
  <li>Single seller; high barriers to entry; price maker; abnormal profit possible long-run</li>
  <li>Deadweight loss — under-production vs perfect competition</li>
  <li>Economies of scale possible; may invest more in R&D</li>
</ul>
<h3>Oligopoly</h3>
<ul>
  <li>Few dominant firms; interdependence; kinked demand curve (price rigidity)</li>
  <li>Non-price competition (advertising, quality)</li>
  <li>Possible collusion (cartel) — anti-competitive</li>
</ul>
<h3>Monopolistic Competition</h3>
<ul>
  <li>Many firms; differentiated products; relatively free entry</li>
  <li>Abnormal profit short-run; normal profit long-run</li>
</ul>`,

    'AD/AS model': `
<h2>AD/AS Model</h2>
<h3>Aggregate Demand (AD)</h3>
<div class="formula">AD = C + I + G + (X − M)</div>
<ul>
  <li>C = consumer spending, I = investment, G = government spending, X−M = net exports</li>
  <li>AD slopes downward (wealth effect, interest rate effect, trade effect)</li>
</ul>
<h3>Aggregate Supply (AS)</h3>
<ul>
  <li><strong>SRAS</strong>: slopes upward — higher price level → more profitable to produce</li>
  <li><strong>LRAS</strong>: vertical at potential output — capacity constraint</li>
</ul>
<h3>Shifts</h3>
<ul>
  <li>AD shifts right: expansionary fiscal/monetary policy, higher consumer confidence</li>
  <li>SRAS shifts right: lower input costs, improved technology</li>
  <li>LRAS shifts right: structural reform, improved education, infrastructure</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE HISTORY (igcse_hist)
  ════════════════════════════════════════════════════════════════ */
  igcse_hist: {

    'Long-term causes (MAIN)': `
<h2>Causes of World War One — MAIN</h2>
<h3>Militarism</h3>
<p>European powers built up massive armies and navies. Arms race between Britain and Germany (naval race). Military planning became dominant (e.g. Schlieffen Plan).</p>
<h3>Alliance System</h3>
<p>Triple Alliance (Germany, Austria-Hungary, Italy) vs Triple Entente (Britain, France, Russia). Meant a small conflict could drag in all powers.</p>
<h3>Imperialism</h3>
<p>Competition for colonies created tensions. Morocco Crises (1905, 1911) nearly caused war between France and Germany.</p>
<h3>Nationalism</h3>
<p>Strong nationalist feelings, especially in the Balkans. Pan-Slavism in Serbia threatened Austria-Hungary. Assassination of Archduke Franz Ferdinand was nationalist-motivated.</p>`,

    'Cuban Missile Crisis': `
<h2>Cuban Missile Crisis (1962)</h2>
<h3>Background</h3>
<p>USSR placed nuclear missiles in Cuba, 90 miles from USA. Discovered by US spy planes on 14 October 1962.</p>
<h3>13 days of crisis</h3>
<ul>
  <li>Kennedy imposed naval <strong>quarantine</strong> (blockade) around Cuba</li>
  <li>Khrushchev ordered Soviet ships to continue — then turned back</li>
  <li>Tense negotiations through back channels</li>
  <li>US secretly agreed to remove missiles from Turkey; USSR publicly removed missiles from Cuba</li>
</ul>
<h3>Results</h3>
<ul>
  <li>Closest the Cold War came to nuclear war</li>
  <li><strong>Hotline</strong> (red phone) established between Washington and Moscow</li>
  <li>Limited Test Ban Treaty (1963)</li>
  <li>Khrushchev's prestige damaged; partly led to his removal in 1964</li>
</ul>`,

    'Reliability & utility': `
<h2>Source Analysis Skills</h2>
<h3>Reliability</h3>
<p>A source is reliable if it gives an accurate picture of the past. Ask:</p>
<ul>
  <li>Who produced it? (Provenance — author, date, purpose)</li>
  <li>Is the author in a position to know?</li>
  <li>Do they have a reason to lie or exaggerate?</li>
  <li>Does it agree with other evidence?</li>
</ul>
<h3>Utility</h3>
<p>A source is useful if it helps you answer a specific question. Even biased sources can be useful — as evidence of what people believed at the time.</p>
<div class="tip">Exam tip: Never say a source is "completely reliable" or "useless" — always explain what it is useful FOR and its limitations.</div>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE GEOGRAPHY (igcse_geog)
  ════════════════════════════════════════════════════════════════ */
  igcse_geog: {

    'Demographic transition model': `
<h2>Demographic Transition Model (DTM)</h2>
<p>Shows how birth rate, death rate, and population change over time in 5 stages.</p>
<ul>
  <li><strong>Stage 1</strong>: High BR, High DR → stable low population (pre-industrial)</li>
  <li><strong>Stage 2</strong>: High BR, falling DR → rapid population growth (improving healthcare)</li>
  <li><strong>Stage 3</strong>: Falling BR, low DR → slowing growth (urbanisation, education, contraception)</li>
  <li><strong>Stage 4</strong>: Low BR, Low DR → stable high population (MEDCs today)</li>
  <li><strong>Stage 5</strong>: BR below DR → declining population (some European countries)</li>
</ul>`,

    'Plate tectonics': `
<h2>Plate Tectonics</h2>
<h3>Types of plate boundary</h3>
<ul>
  <li><strong>Destructive (convergent)</strong>: plates move together; subduction; volcanoes and earthquakes; e.g. Andes</li>
  <li><strong>Constructive (divergent)</strong>: plates move apart; new crust formed; rift valleys; e.g. Mid-Atlantic Ridge</li>
  <li><strong>Conservative (transform)</strong>: plates slide past; earthquakes only; e.g. San Andreas Fault</li>
  <li><strong>Collision</strong>: both continental; fold mountains; e.g. Himalayas</li>
</ul>
<h3>Causes of tectonic movement</h3>
<p>Convection currents in the mantle drive plate movement.</p>`,

    'Climate change causes & effects': `
<h2>Climate Change</h2>
<h3>Natural causes</h3>
<ul>
  <li>Milankovitch cycles (orbital changes)</li>
  <li>Volcanic eruptions (short-term cooling)</li>
  <li>Solar output variation</li>
</ul>
<h3>Human causes (main driver since 1950s)</h3>
<ul>
  <li>Burning fossil fuels → CO₂</li>
  <li>Deforestation → less CO₂ absorbed</li>
  <li>Agriculture → methane (livestock, rice paddies)</li>
  <li>Industry → nitrous oxide and other GHGs</li>
</ul>
<h3>Effects</h3>
<ul>
  <li>Rising sea levels (thermal expansion + ice melt)</li>
  <li>More extreme weather events</li>
  <li>Shifting biomes and species migration</li>
  <li>Glacial retreat</li>
  <li>Ocean acidification</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE COMPUTER SCIENCE (igcse_cs)
  ════════════════════════════════════════════════════════════════ */
  igcse_cs: {

    'Binary & denary': `
<h2>Number Systems</h2>
<h3>Binary (base 2)</h3>
<p>Uses digits 0 and 1. Each position is a power of 2.</p>
<p>Example: 1011₂ = 8+0+2+1 = 11₁₀</p>
<h3>Denary to binary</h3>
<p>Repeatedly divide by 2 and record remainders (bottom-up = MSB to LSB).</p>
<h3>Binary addition</h3>
<ul>
  <li>0+0 = 0</li>
  <li>0+1 = 1</li>
  <li>1+1 = 10 (write 0, carry 1)</li>
  <li>1+1+1 = 11 (write 1, carry 1)</li>
</ul>
<h3>Hexadecimal (base 16)</h3>
<p>Digits: 0-9, then A(10), B(11), C(12), D(13), E(14), F(15).</p>
<p>4 binary bits = 1 hex digit. Used as a shorthand for binary.</p>`,

    'CPU components & fetch-execute': `
<h2>CPU & The Fetch-Execute Cycle</h2>
<h3>Key components</h3>
<ul>
  <li><strong>ALU</strong> (Arithmetic Logic Unit) — performs calculations and logical operations</li>
  <li><strong>CU</strong> (Control Unit) — manages and coordinates CPU operations</li>
  <li><strong>MAR</strong> — Memory Address Register; holds address being read/written</li>
  <li><strong>MDR</strong> — Memory Data Register; temporarily holds data being transferred</li>
  <li><strong>PC</strong> — Program Counter; holds address of next instruction</li>
  <li><strong>Accumulator</strong> — stores result of calculations</li>
  <li><strong>Cache</strong> — fast memory close to CPU</li>
</ul>
<h3>Fetch-Execute cycle</h3>
<ul>
  <li><strong>Fetch</strong>: copy instruction from address in PC to MDR, increment PC</li>
  <li><strong>Decode</strong>: CU decodes the instruction</li>
  <li><strong>Execute</strong>: instruction is carried out (by ALU or other units)</li>
</ul>
<h3>CPU performance factors</h3>
<ul>
  <li>Clock speed (GHz) — more cycles per second</li>
  <li>Number of cores — parallel processing</li>
  <li>Cache size — faster data access</li>
</ul>`,

    'Bubble & insertion sort': `
<h2>Sorting Algorithms</h2>
<h3>Bubble Sort</h3>
<p>Compare adjacent pairs, swap if wrong order. Repeat for n-1 passes. Largest values "bubble" to the end.</p>
<ul>
  <li>Best case: O(n) — already sorted</li>
  <li>Worst case: O(n²) — reverse sorted</li>
</ul>
<h3>Insertion Sort</h3>
<p>Build sorted portion from left. For each element, insert it into the correct position in the sorted portion.</p>
<ul>
  <li>Efficient for nearly-sorted data</li>
  <li>Worst case: O(n²)</li>
</ul>
<div class="tip">Exam tip: Bubble sort is simple but slow; insertion sort performs better on nearly sorted data.</div>`,
  },

  /* ════════════════════════════════════════════════════════════════
     AS BIOLOGY (as_bio)
  ════════════════════════════════════════════════════════════════ */
  as_bio: {

    'Biological molecules': `
<h2>Biological Molecules</h2>
<h3>Carbohydrates</h3>
<ul>
  <li><strong>Monosaccharides</strong>: glucose, fructose, galactose — formula C₆H₁₂O₆</li>
  <li><strong>Disaccharides</strong>: maltose (glucose+glucose), sucrose (glucose+fructose), lactose (glucose+galactose) — formed by condensation reaction</li>
  <li><strong>Polysaccharides</strong>: starch (storage in plants), glycogen (storage in animals), cellulose (structural in plants)</li>
</ul>
<h3>Proteins</h3>
<p>Made of amino acids joined by peptide bonds (condensation reactions). Four levels of structure: primary, secondary (α-helix/β-pleated sheet), tertiary (3D fold), quaternary (multiple chains).</p>
<h3>Lipids</h3>
<ul>
  <li>Triglycerides: glycerol + 3 fatty acids (ester bonds); energy storage</li>
  <li>Phospholipids: glycerol + 2 fatty acids + phosphate group; cell membrane structure</li>
</ul>`,

    'DNA structure & replication': `
<h2>DNA Structure & Replication</h2>
<h3>Structure</h3>
<ul>
  <li>Double helix of two antiparallel polynucleotide strands</li>
  <li>Nucleotides: deoxyribose sugar + phosphate + base (A, T, C, G)</li>
  <li>Complementary base pairing: A–T (2 H-bonds), C–G (3 H-bonds)</li>
  <li>Strands run antiparallel (5'→3' and 3'→5')</li>
</ul>
<h3>Semi-conservative replication</h3>
<ul>
  <li>DNA helicase unwinds and unzips the double helix (breaks H-bonds)</li>
  <li>Each original strand acts as a template</li>
  <li>DNA polymerase adds complementary nucleotides (5'→3' direction)</li>
  <li>Each new molecule has one old and one new strand</li>
</ul>`,

    'Protein synthesis': `
<h2>Protein Synthesis</h2>
<h3>Transcription (nucleus)</h3>
<ul>
  <li>RNA polymerase binds to promoter region; unwinds DNA</li>
  <li>Complementary mRNA strand built (U instead of T)</li>
  <li>mRNA processed and leaves nucleus via nuclear pores</li>
</ul>
<h3>Translation (ribosome)</h3>
<ul>
  <li>mRNA binds to ribosome</li>
  <li>tRNA molecules carry specific amino acids (anticodon matches codon)</li>
  <li>Each codon (3 bases) codes for one amino acid</li>
  <li>Peptide bonds form between amino acids → polypeptide chain</li>
  <li>Stop codon terminates translation</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     AS CHEMISTRY (as_chem)
  ════════════════════════════════════════════════════════════════ */
  as_chem: {

    'Atomic structure': `
<h2>Atomic Structure (AS)</h2>
<h3>Sub-atomic particles</h3>
<ul>
  <li>Proton: +1 charge, mass 1</li>
  <li>Neutron: 0 charge, mass 1</li>
  <li>Electron: −1 charge, mass ~0</li>
</ul>
<h3>Electron configuration</h3>
<p>Sub-shells: s(2), p(6), d(10), f(14). Fill in order: 1s, 2s, 2p, 3s, 3p, 4s, 3d...</p>
<p>Example: Fe (26e⁻): [Ar] 3d⁶ 4s² → Fe²⁺: [Ar] 3d⁶</p>
<h3>Ionisation energy</h3>
<div class="formula">1st IE: X(g) → X⁺(g) + e⁻</div>
<p>Trends: increases across period (increasing nuclear charge); decreases down group (shielding, larger atomic radius)</p>`,

    'Chemical bonding': `
<h2>Chemical Bonding (AS)</h2>
<h3>Electronegativity & bond polarity</h3>
<p>Electronegativity increases across period, decreases down group. Large difference → ionic; small difference → covalent; moderate → polar covalent.</p>
<h3>Shapes of molecules (VSEPR)</h3>
<ul>
  <li>2 bonding pairs: linear (180°)</li>
  <li>3 BP: trigonal planar (120°)</li>
  <li>4 BP: tetrahedral (109.5°)</li>
  <li>3 BP + 1 LP: trigonal pyramidal (107°) e.g. NH₃</li>
  <li>2 BP + 2 LP: bent (104.5°) e.g. H₂O</li>
</ul>
<h3>Intermolecular forces</h3>
<ul>
  <li>Van der Waals (London dispersion) — all molecules; strongest in large molecules</li>
  <li>Dipole-dipole — polar molecules</li>
  <li>Hydrogen bonds — molecules with N–H, O–H, or F–H bonds</li>
</ul>`,

    'Energetics': `
<h2>Energetics (AS)</h2>
<h3>Enthalpy change</h3>
<p>ΔH = energy change at constant pressure. Negative = exothermic; positive = endothermic.</p>
<h3>Hess's Law</h3>
<p>Enthalpy change is path-independent. Use indirect routes if direct is not possible.</p>
<div class="formula">ΔH_reaction = ΣΔHf(products) − ΣΔHf(reactants)</div>
<h3>Bond enthalpies</h3>
<div class="formula">ΔH = ΣE(bonds broken) − ΣE(bonds formed)</div>
<p>Breaking bonds requires energy (+ve); forming bonds releases energy (−ve).</p>
<div class="tip">Exam tip: Bond enthalpy calculations are approximate (use average values). Hess's law gives more accurate results.</div>`,
  },

  /* ════════════════════════════════════════════════════════════════
     A2 PHYSICS (a2_phys)
  ════════════════════════════════════════════════════════════════ */
  a2_phys: {

    'Simple harmonic motion': `
<h2>Simple Harmonic Motion (SHM)</h2>
<p>Oscillatory motion where the acceleration is <strong>proportional to displacement</strong> and always directed <strong>towards the equilibrium position</strong>.</p>
<div class="formula">a = −ω²x  (defining equation of SHM)</div>
<div class="formula">ω = 2πf = 2π/T</div>
<div class="formula">x = A cos(ωt)  or  x = A sin(ωt)</div>
<div class="formula">v = −Aω sin(ωt)  →  vmax = Aω  (at equilibrium)</div>
<div class="formula">a = −Aω² cos(ωt)  →  amax = Aω²  (at max displacement)</div>
<h3>Energy in SHM</h3>
<ul>
  <li>At equilibrium: all KE, zero PE</li>
  <li>At maximum displacement: all PE, zero KE</li>
  <li>Total energy ∝ A² (constant in undamped SHM)</li>
</ul>
<h3>Examples</h3>
<ul>
  <li>Simple pendulum: T = 2π√(L/g) — independent of amplitude (for small angles)</li>
  <li>Mass-spring: T = 2π√(m/k)</li>
</ul>`,

    'Gravitational fields': `
<h2>Gravitational Fields (A2)</h2>
<div class="formula">g = F/m  (gravitational field strength)</div>
<div class="formula">F = Gm₁m₂/r²  (Newton's law of gravitation)</div>
<div class="formula">g = GM/r²</div>
<div class="formula">Gravitational potential: φ = −GM/r</div>
<h3>Orbital motion</h3>
<div class="formula">T² = (4π²/GM) × r³  (Kepler's third law)</div>
<p>Geostationary orbit: T = 24 hours; orbit above equator; used for communications satellites.</p>`,

    'Photoelectric effect': `
<h2>Photoelectric Effect</h2>
<p>Electrons emitted from a metal surface when light above a threshold frequency hits it. Proves light is quantised (photons).</p>
<div class="formula">E = hf  (photon energy)</div>
<div class="formula">hf = φ + ½mv²max</div>
<p>φ = work function (minimum energy to remove an electron)</p>
<div class="formula">Threshold frequency: f₀ = φ/h</div>
<h3>Key observations</h3>
<ul>
  <li>Below threshold frequency: no emission, regardless of intensity</li>
  <li>Above threshold: emission is instantaneous</li>
  <li>Increasing intensity → more electrons, not more energy per electron</li>
  <li>Increasing frequency → more kinetic energy per electron</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     A2 CHEMISTRY (a2_chem)
  ════════════════════════════════════════════════════════════════ */
  a2_chem: {

    'Electrode potentials': `
<h2>Electrode Potentials (A2)</h2>
<p>Standard electrode potential E° measured under standard conditions (298K, 1 mol/dm³, 100 kPa) relative to the standard hydrogen electrode (E° = 0 V).</p>
<div class="formula">E°cell = E°cathode − E°anode  (more +ve − less +ve)</div>
<h3>Feasibility</h3>
<p>Reaction is feasible (spontaneous) if E°cell > 0</p>
<div class="formula">ΔG° = −nFE°cell</div>
<p>n = moles of electrons transferred, F = Faraday constant (96500 C/mol)</p>
<div class="tip">Exam tip: Feasibility from electrode potentials is thermodynamic — the reaction may still be slow kinetically.</div>`,

    'Benzene & electrophilic substitution': `
<h2>Benzene & Aromatic Chemistry</h2>
<h3>Structure of benzene</h3>
<ul>
  <li>Delocalised π electron system (ring of 6 electrons above/below plane)</li>
  <li>All C–C bond lengths equal (intermediate between single and double)</li>
  <li>Planar hexagonal structure</li>
</ul>
<h3>Electrophilic substitution</h3>
<p>Benzene reacts by <strong>substitution</strong> (not addition) to preserve the stable aromatic ring.</p>
<ul>
  <li><strong>Nitration</strong>: conc. HNO₃ + conc. H₂SO₄ (50°C) → nitrobenzene + H₂O; electrophile = NO₂⁺ (nitronium ion)</li>
  <li><strong>Halogenation</strong>: Cl₂/Br₂ + halogen carrier (AlCl₃/FeBr₃) → halogenobenzene; electrophile = Cl⁺/Br⁺</li>
  <li><strong>Friedel-Crafts alkylation</strong>: RCl + AlCl₃ → alkylbenzene</li>
  <li><strong>Friedel-Crafts acylation</strong>: RCOCl + AlCl₃ → acylbenzene (ketone)</li>
</ul>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE ENGLISH LITERATURE (igcse_englit)
  ════════════════════════════════════════════════════════════════ */
  igcse_englit: {

    'Poetic devices': `
<h2>Poetic Devices</h2>
<ul>
  <li><strong>Simile</strong>: comparison using "like" or "as" — e.g. "She is like a rose"</li>
  <li><strong>Metaphor</strong>: direct comparison — e.g. "Life is a rollercoaster"</li>
  <li><strong>Personification</strong>: giving human qualities to non-human things</li>
  <li><strong>Alliteration</strong>: repetition of initial consonant sounds — creates rhythm/emphasis</li>
  <li><strong>Assonance</strong>: repetition of vowel sounds — creates mood/musicality</li>
  <li><strong>Sibilance</strong>: repeated "s" sounds — hissing effect, can feel unsettling</li>
  <li><strong>Enjambment</strong>: sentence runs over line break — suggests movement, urgency</li>
  <li><strong>Caesura</strong>: pause mid-line (punctuation) — creates hesitation, emphasis</li>
  <li><strong>Volta</strong>: turning point in a poem — shift in tone or argument</li>
  <li><strong>Anaphora</strong>: repetition at start of successive lines — creates rhythm and emphasis</li>
</ul>
<div class="tip">Exam tip: Never just name a device — always explain the EFFECT it creates on the reader.</div>`,

    'Essay structure': `
<h2>Essay Writing for Literature</h2>
<h3>PEE structure</h3>
<ul>
  <li><strong>Point</strong>: make a clear analytical argument</li>
  <li><strong>Evidence</strong>: quote from the text (short, precise)</li>
  <li><strong>Explanation</strong>: analyse HOW the language creates the effect</li>
</ul>
<h3>High-level responses also consider</h3>
<ul>
  <li><strong>Context</strong>: how does the historical/social context influence the text?</li>
  <li><strong>Alternative interpretations</strong>: "Some readers might argue..."</li>
  <li><strong>Form and structure</strong>: how does the shape/organisation of the text contribute to meaning?</li>
  <li><strong>Language choices</strong>: specific word choices (connotations, register, tone)</li>
</ul>
<div class="tip">Exam tip: Aim for 3–4 well-developed paragraphs rather than 6 underdeveloped ones. Quality over quantity.</div>`,
  },

  /* ════════════════════════════════════════════════════════════════
     IGCSE ENGLISH LANGUAGE (igcse_englang)
  ════════════════════════════════════════════════════════════════ */
  igcse_englang: {

    'Summary writing': `
<h2>Summary Writing Skills</h2>
<h3>Key rules</h3>
<ul>
  <li>Use your own words — paraphrase, don't copy chunks</li>
  <li>Include only relevant information for the specific question</li>
  <li>Write in continuous prose (not bullet points)</li>
  <li>Stick to the word limit if given</li>
  <li>Do not include your own opinions or evaluations</li>
</ul>
<h3>Process</h3>
<ul>
  <li>1. Read the question carefully — what specific information is needed?</li>
  <li>2. Highlight/identify relevant points in the text</li>
  <li>3. Rewrite each point in your own words</li>
  <li>4. Connect with linking language (furthermore, however, additionally)</li>
</ul>`,

    'Persuasive writing': `
<h2>Persuasive Writing</h2>
<h3>AFOREST techniques</h3>
<ul>
  <li><strong>A</strong>necdote — personal story to create emotional connection</li>
  <li><strong>F</strong>act — statistics and data to appear credible</li>
  <li><strong>O</strong>pinion — stated as fact to seem authoritative</li>
  <li><strong>R</strong>hetoric — rhetorical questions, tricolon, repetition</li>
  <li><strong>E</strong>xpert opinion — quote a specialist/authority</li>
  <li><strong>S</strong>tatistic — numbers create an impression of objectivity</li>
  <li><strong>T</strong>opical — reference to current events for relevance</li>
</ul>
<h3>Register</h3>
<p>Formal for articles/speeches; adapt tone to your audience. Avoid slang in formal writing.</p>`,
  },
};
