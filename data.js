/* ── Levels ─────────────────────────────────────────────────────── */
const LEVELS = [
  { id: 'igcse', name: 'IGCSE',    badge: 'IGCSE' },
  { id: 'as',    name: 'AS Level', badge: 'AS'    },
  { id: 'a2',    name: 'A2 Level', badge: 'A2'    },
];

/* ── All subjects ───────────────────────────────────────────────── */
const ALL_SUBJECTS = [
  /* ════════════ IGCSE ════════════════════════════════════════════ */
  {
    id: 'igcse_maths', level: 'igcse', name: 'Mathematics', icon: '📐',
    color: '#3b82f6', syllabus: '0580',
    topics: [
      { name: 'Number', subtopics: ['Integers & decimals', 'Fractions & percentages', 'Ratios & proportions', 'Standard form', 'Surds & indices', 'Sets'] },
      { name: 'Algebra', subtopics: ['Expressions & formulae', 'Linear equations', 'Inequalities', 'Sequences', 'Functions', 'Quadratics', 'Simultaneous equations'] },
      { name: 'Geometry & Trigonometry', subtopics: ['Angles & polygons', 'Circle theorems', 'Trigonometry', 'Vectors', 'Transformations', 'Mensuration'] },
      { name: 'Statistics & Probability', subtopics: ['Data representation', 'Averages & spread', 'Probability', 'Scatter diagrams', 'Cumulative frequency'] },
      { name: 'Coordinate Geometry', subtopics: ['Straight lines', 'Midpoints & gradients', 'Graphs of functions'] },
    ],
  },
  {
    id: 'igcse_econ', level: 'igcse', name: 'Economics', icon: '📈',
    color: '#06b6d4', syllabus: '0455',
    topics: [
      { name: 'Basic Economic Problem', subtopics: ['Scarcity & choice', 'Opportunity cost', 'Factors of production', 'Economic systems'] },
      { name: 'Demand & Supply', subtopics: ['Demand', 'Supply', 'Price determination', 'Elasticities (PED, PES, YED, XED)'] },
      { name: 'Market Failure & Government', subtopics: ['Market failure', 'Externalities', 'Government intervention', 'Taxation & subsidies'] },
      { name: 'Business Economics', subtopics: ['Costs & revenue', 'Market structures', 'Business objectives'] },
      { name: 'Money & Banking', subtopics: ['Functions of money', 'Role of banks', 'Monetary policy'] },
      { name: 'Macroeconomics', subtopics: ['National income', 'Inflation', 'Unemployment', 'Economic growth', 'Balance of payments'] },
      { name: 'International Trade', subtopics: ['Benefits of trade', 'Trade barriers', 'Exchange rates', 'Globalisation'] },
      { name: 'Development', subtopics: ['Measures of development', 'Causes of poverty', 'Development policies'] },
    ],
  },
  {
    id: 'igcse_englit', level: 'igcse', name: 'English Literature', icon: '📖',
    color: '#ec4899', syllabus: '0475',
    topics: [
      { name: 'Poetry', subtopics: ['Poetic devices', 'Unseen poetry', 'Anthology comparison', 'Themes in poetry'] },
      { name: 'Prose', subtopics: ['Character analysis', "Writer's craft", 'Narrative techniques', 'Setting & atmosphere'] },
      { name: 'Drama', subtopics: ['Dramatic techniques', 'Character & motivation', 'Themes & context'] },
      { name: 'Critical Writing', subtopics: ['Essay structure', 'PEE paragraphs', 'Quotation & analysis', 'Comparative writing'] },
    ],
  },
  {
    id: 'igcse_englang', level: 'igcse', name: 'English Language', icon: '✍️',
    color: '#f43f5e', syllabus: '0500',
    topics: [
      { name: 'Reading Skills', subtopics: ['Comprehension', 'Inference', 'Summary writing', 'Language analysis'] },
      { name: 'Writing Skills', subtopics: ['Narrative writing', 'Descriptive writing', 'Persuasive writing', 'Informative writing'] },
      { name: 'Language Techniques', subtopics: ['Imagery', 'Tone & voice', 'Structural features', 'Rhetorical devices'] },
      { name: 'Grammar & Vocabulary', subtopics: ['Sentence structure', 'Punctuation', 'Vocabulary development', 'Register & audience'] },
    ],
  },
  {
    id: 'igcse_cscience', level: 'igcse', name: 'Combined Science', icon: '🔬',
    color: '#10b981', syllabus: '0653',
    topics: [
      { name: 'Biology', subtopics: ['Cells & organisms', 'Nutrition & digestion', 'Respiration', 'Genetics', 'Ecology'] },
      { name: 'Chemistry', subtopics: ['Atomic structure', 'Bonding', 'Reactions', 'Organic chemistry', 'Periodic Table'] },
      { name: 'Physics', subtopics: ['Forces & motion', 'Energy', 'Waves', 'Electricity', 'Radioactivity'] },
    ],
  },
  {
    id: 'igcse_bio', level: 'igcse', name: 'Biology', icon: '🧬',
    color: '#22c55e', syllabus: '0610',
    topics: [
      { name: 'Cell Biology', subtopics: ['Animal & plant cells', 'Specialised cells', 'Microscopy', 'Diffusion, osmosis & active transport'] },
      { name: 'Enzymes & Nutrition', subtopics: ['Enzyme action', 'Factors affecting enzymes', 'Photosynthesis', 'Animal nutrition & digestion'] },
      { name: 'Respiration & Gas Exchange', subtopics: ['Aerobic respiration', 'Anaerobic respiration', 'Breathing system', 'Gas exchange in leaves'] },
      { name: 'Transport', subtopics: ['Blood & blood vessels', 'Heart structure & function', 'Transpiration', 'Transport in plants'] },
      { name: 'Excretion & Homeostasis', subtopics: ['Kidney structure & function', 'Thermoregulation', 'Blood glucose regulation', 'Liver functions'] },
      { name: 'Coordination', subtopics: ['Nervous system', 'Hormones', 'Sense organs', 'Reflex arc'] },
      { name: 'Reproduction', subtopics: ['Sexual reproduction', 'Asexual reproduction', 'Human reproduction', 'Pollination & fertilisation in plants'] },
      { name: 'Genetics', subtopics: ['DNA & genes', 'Monohybrid inheritance', 'Codominance & sex linkage', 'Mutation'] },
      { name: 'Evolution & Ecology', subtopics: ['Natural selection', 'Food chains & webs', 'Carbon & nitrogen cycles', 'Populations & conservation'] },
    ],
  },
  {
    id: 'igcse_chem', level: 'igcse', name: 'Chemistry', icon: '⚗️',
    color: '#f59e0b', syllabus: '0620',
    topics: [
      { name: 'Experimental Techniques', subtopics: ['Separation methods', 'Chromatography', 'Identification tests'] },
      { name: 'Atomic Structure & Periodic Table', subtopics: ['Subatomic particles', 'Electronic configuration', 'Isotopes', 'Periodic trends'] },
      { name: 'Bonding & Structure', subtopics: ['Ionic bonding', 'Covalent bonding', 'Metallic bonding', 'Properties of structures'] },
      { name: 'Stoichiometry', subtopics: ['Moles', 'Formulae & equations', 'Concentration calculations', 'Yield & purity'] },
      { name: 'Electrochemistry', subtopics: ['Electrolysis', 'Half-equations', 'Voltaic cells', 'Rusting & prevention'] },
      { name: 'Chemical Energetics', subtopics: ['Exothermic & endothermic', 'Bond energies', 'Energy profile diagrams'] },
      { name: 'Reaction Rates & Equilibrium', subtopics: ['Factors affecting rate', 'Collision theory', 'Reversible reactions', "Le Chatelier's principle"] },
      { name: 'Acids, Bases & Salts', subtopics: ['pH scale', 'Acid & base reactions', 'Preparation of salts', 'Titration'] },
      { name: 'Metals & Reactivity', subtopics: ['Reactivity series', 'Extraction of metals', 'Alloys', 'Corrosion'] },
      { name: 'Organic Chemistry', subtopics: ['Alkanes', 'Alkenes & addition reactions', 'Alcohols', 'Carboxylic acids', 'Polymers'] },
    ],
  },
  {
    id: 'igcse_phys', level: 'igcse', name: 'Physics', icon: '⚛️',
    color: '#3b82f6', syllabus: '0625',
    topics: [
      { name: 'Motion & Forces', subtopics: ['Speed, velocity & acceleration', 'Distance-time & velocity-time graphs', "Newton's laws", 'Momentum & impulse', 'Pressure'] },
      { name: 'Energy, Work & Power', subtopics: ['Forms of energy', 'Kinetic & potential energy', 'Work & power', 'Efficiency', 'Energy resources'] },
      { name: 'Thermal Physics', subtopics: ['Temperature & heat', 'Specific heat capacity', 'Latent heat', 'Gas laws', 'Conduction, convection & radiation'] },
      { name: 'Waves & Optics', subtopics: ['Wave properties', 'Sound', 'Reflection & refraction of light', 'Lenses', 'Electromagnetic spectrum'] },
      { name: 'Electricity & Magnetism', subtopics: ['Static electricity', 'Current, voltage & resistance', 'Circuits', 'Domestic electricity', 'Electromagnetic effects', 'Transformers'] },
      { name: 'Atomic & Nuclear Physics', subtopics: ['Atomic model', 'Radioactive emissions', 'Half-life', 'Nuclear reactions & safety'] },
    ],
  },
  {
    id: 'igcse_cs', level: 'igcse', name: 'Computer Science', icon: '💻',
    color: '#8b5cf6', syllabus: '0478',
    topics: [
      { name: 'Data Representation', subtopics: ['Binary & denary', 'Hexadecimal', 'ASCII & Unicode', 'Image & sound representation'] },
      { name: 'Networks & Internet', subtopics: ['Network types', 'Internet protocols', 'World Wide Web', 'Encryption & security'] },
      { name: 'Hardware', subtopics: ['CPU components & fetch-execute', 'Memory types', 'Storage devices', 'Logic gates & truth tables'] },
      { name: 'Software', subtopics: ['Operating systems', 'Programming languages', 'Translators', 'Software development lifecycle'] },
      { name: 'Security & Ethics', subtopics: ['Cybersecurity threats', 'Protection measures', 'Privacy & data protection', 'Ethical & legal issues'] },
      { name: 'Databases', subtopics: ['Database concepts', 'Tables & relationships', 'SQL queries'] },
      { name: 'Programming Concepts', subtopics: ['Data types & variables', 'Sequence, selection & iteration', 'Procedures & functions', 'Arrays & file handling'] },
      { name: 'Algorithms', subtopics: ['Pseudocode & flowcharts', 'Bubble & insertion sort', 'Binary & linear search', 'Testing & trace tables'] },
    ],
  },
  {
    id: 'igcse_hist', level: 'igcse', name: 'History', icon: '🏛️',
    color: '#dc2626', syllabus: '0470',
    topics: [
      { name: 'World War One', subtopics: ['Long-term causes (MAIN)', 'Short-term causes', 'Trench warfare', 'End of WWI & armistice'] },
      { name: 'The Interwar Period', subtopics: ['Paris Peace Conference', 'Treaty of Versailles', 'League of Nations', 'Rise of Hitler & fascism'] },
      { name: 'World War Two', subtopics: ['Causes of WWII', 'Key campaigns', 'The Holocaust', 'Allied victory'] },
      { name: 'Cold War', subtopics: ['Origins of the Cold War', 'Korean War', 'Cuban Missile Crisis', 'Berlin & the Wall', 'End of Cold War'] },
      { name: 'Source Skills', subtopics: ['Reliability & utility', 'Provenance analysis', 'Inference & cross-referencing', 'Exam technique'] },
    ],
  },
  {
    id: 'igcse_geog', level: 'igcse', name: 'Geography', icon: '🌍',
    color: '#059669', syllabus: '0460',
    topics: [
      { name: 'Population & Migration', subtopics: ['Population growth', 'Demographic transition model', 'Migration', 'Urbanisation'] },
      { name: 'Settlement & Urban Issues', subtopics: ['Urban land use', 'Urban growth in LEDCs/MEDCs', 'Urban problems & solutions'] },
      { name: 'Economic Activity', subtopics: ['Agriculture types', 'Industry & location', 'Tourism', 'Energy resources'] },
      { name: 'Natural Environments', subtopics: ['Plate tectonics', 'Earthquakes & volcanoes', 'Rivers & flooding', 'Coasts', 'Weather & climate'] },
      { name: 'Environment & Sustainability', subtopics: ['Climate change causes & effects', 'Deforestation', 'Water supply', 'Desertification'] },
    ],
  },

  /* ════════════ AS LEVEL ═════════════════════════════════════════ */
  {
    id: 'as_maths', level: 'as', name: 'Mathematics', icon: '∑',
    color: '#a855f7', syllabus: '9709',
    topics: [
      { name: 'Pure 1', subtopics: ['Quadratics', 'Functions', 'Coordinate geometry', 'Circular measure', 'Trigonometry', 'Binomial expansion', 'Differentiation', 'Integration'] },
      { name: 'Pure 2', subtopics: ['Algebra & division', 'Logarithms & exponentials', 'Trigonometry identities', 'Differentiation techniques', 'Integration techniques', 'Numerical methods'] },
      { name: 'Statistics 1', subtopics: ['Data representation', 'Permutations & combinations', 'Probability', 'Discrete random variables', 'Normal distribution', 'Sampling & estimation'] },
      { name: 'Mechanics 1', subtopics: ['Forces & equilibrium', 'Kinematics (SUVAT)', "Newton's laws", 'Energy & momentum', 'Friction'] },
    ],
  },
  {
    id: 'as_fm', level: 'as', name: 'Further Mathematics', icon: '∞',
    color: '#7c3aed', syllabus: '9231',
    topics: [
      { name: 'Further Pure 1', subtopics: ['Polynomials & roots', 'Rational functions', 'Polar coordinates', 'Complex numbers', 'Matrices', 'Summation of series'] },
      { name: 'Further Pure 2', subtopics: ['Differential equations', 'Advanced complex numbers', 'Group theory', 'Proof by induction', 'Hyperbolic functions'] },
      { name: 'Further Statistics 1', subtopics: ['Estimation & confidence intervals', 'Hypothesis testing', 'Chi-squared', 'Regression & correlation'] },
      { name: 'Further Mechanics 1', subtopics: ['Projectiles', 'Elastic strings & springs', 'Circular motion', 'Dimensional analysis'] },
    ],
  },
  {
    id: 'as_econ', level: 'as', name: 'Economics', icon: '📊',
    color: '#0891b2', syllabus: '9708',
    topics: [
      { name: 'Microeconomics', subtopics: ['Demand & supply analysis', 'Elasticities', 'Consumer & producer surplus', 'Market structures', 'Market failure & externalities', 'Government policies'] },
      { name: 'Macroeconomics', subtopics: ['National income accounting', 'AD/AS model', 'Inflation', 'Unemployment', 'Balance of payments', 'Economic growth', 'Fiscal & monetary policy'] },
    ],
  },
  {
    id: 'as_englit', level: 'as', name: 'English Literature', icon: '📚',
    color: '#db2777', syllabus: '9695',
    topics: [
      { name: 'Poetry', subtopics: ['Close reading techniques', 'Pre-20th century poetry', 'Contextual analysis', 'Comparative poetry essay'] },
      { name: 'Prose', subtopics: ['Narrative techniques', 'Character & voice', 'Context & theme', 'Comparative prose'] },
      { name: 'Drama', subtopics: ['Shakespeare', 'Modern drama', 'Stage & performance', 'Dramatic language'] },
      { name: 'Unseen Texts', subtopics: ['Passage analysis', 'Language & form effects', 'Structural analysis'] },
    ],
  },
  {
    id: 'as_englang', level: 'as', name: 'English Language', icon: '✒️',
    color: '#e11d48', syllabus: '9093',
    topics: [
      { name: 'Reading & Comprehension', subtopics: ['Directed reading', 'Critical analysis', 'Synthesis across texts', 'Evaluation'] },
      { name: 'Writing', subtopics: ['Audience & purpose', 'Register & style', 'Original writing', 'Directed writing'] },
      { name: 'Language Analysis', subtopics: ['Lexical analysis', 'Grammar & syntax', 'Discourse features', 'Pragmatics'] },
    ],
  },
  {
    id: 'as_bio', level: 'as', name: 'Biology', icon: '🔬',
    color: '#16a34a', syllabus: '9700',
    topics: [
      { name: 'Cell Biology', subtopics: ['Eukaryotic & prokaryotic cells', 'Biological molecules', 'Enzymes', 'Cell membranes & transport', 'Mitosis & meiosis'] },
      { name: 'Physiology', subtopics: ['Gas exchange surfaces', 'Transport in animals', 'Transport in plants', 'Nutrition in animals', 'Photosynthesis'] },
      { name: 'Genetics & Evolution', subtopics: ['DNA structure & replication', 'Protein synthesis', 'Inheritance patterns', 'Natural selection & adaptation'] },
      { name: 'Ecology', subtopics: ['Populations & communities', 'Energy flow & food webs', 'Nutrient cycles', 'Human impact on ecosystems'] },
    ],
  },
  {
    id: 'as_chem', level: 'as', name: 'Chemistry', icon: '⚗️',
    color: '#d97706', syllabus: '9701',
    topics: [
      { name: 'Physical Chemistry', subtopics: ['Atomic structure', 'Chemical bonding', 'Energetics', 'Equilibrium & Kc', 'Redox', 'Reaction kinetics'] },
      { name: 'Inorganic Chemistry', subtopics: ['Periodicity', 'Group 2 chemistry', 'Group 17 chemistry', 'Nitrogen & sulfur chemistry'] },
      { name: 'Organic Chemistry', subtopics: ['Functional groups & nomenclature', 'Alkanes & halogenoalkanes', 'Alkenes', 'Alcohols', 'Analytical techniques (MS, IR)'] },
    ],
  },
  {
    id: 'as_phys', level: 'as', name: 'Physics', icon: '⚛️',
    color: '#2563eb', syllabus: '9702',
    topics: [
      { name: 'Physical Quantities & Measurement', subtopics: ['SI units & dimensions', 'Uncertainty & error analysis', 'Scalars & vectors'] },
      { name: 'Kinematics & Dynamics', subtopics: ['SUVAT & projectile motion', "Newton's laws", 'Momentum & impulse', 'Energy & power'] },
      { name: 'Waves', subtopics: ['Wave properties & equations', 'Superposition & interference', 'Diffraction & gratings', 'Electromagnetic spectrum'] },
      { name: 'Electricity', subtopics: ['Charge, current & p.d.', 'Resistance & resistivity', "Kirchhoff's laws", 'Potential dividers & EMF'] },
      { name: 'Particle Physics', subtopics: ['Atomic & nuclear structure', 'Radioactive decay', 'Quarks & leptons'] },
    ],
  },
  {
    id: 'as_cs', level: 'as', name: 'Computer Science', icon: '💻',
    color: '#7c3aed', syllabus: '9618',
    topics: [
      { name: 'Theory of Computation', subtopics: ['Data representation', 'Communication & networking', 'Hardware & CPU architecture', 'Boolean logic & gates'] },
      { name: 'Software Development', subtopics: ['Programming paradigms', 'Data structures', 'Algorithms & complexity', 'OOP concepts', 'Testing strategies'] },
      { name: 'Data & Databases', subtopics: ['Database design', 'SQL', 'Normalisation', 'File handling'] },
      { name: 'Security & Ethics', subtopics: ['Cyber threats', 'Security protocols', 'Social engineering', 'AI & ethics'] },
    ],
  },
  {
    id: 'as_hist', level: 'as', name: 'History', icon: '🏛️',
    color: '#b91c1c', syllabus: '9489',
    topics: [
      { name: 'Historical Skills', subtopics: ['Source evaluation', 'Historiography', 'Essay structure', 'Causation & significance'] },
      { name: '20th Century International', subtopics: ['Origins of WWI', 'Paris Peace Settlement 1919', 'League of Nations', 'Origins of WWII'] },
    ],
  },
  {
    id: 'as_geog', level: 'as', name: 'Geography', icon: '🌍',
    color: '#047857', syllabus: '9696',
    topics: [
      { name: 'Physical Geography', subtopics: ['Hydrology & fluvial geomorphology', 'Atmosphere & weather', 'Coastal environments', 'Glacial environments'] },
      { name: 'Human Geography', subtopics: ['Population dynamics', 'Migration', 'Settlement dynamics', 'Economic transition', 'Global interdependence'] },
    ],
  },

  /* ════════════ A2 LEVEL ═════════════════════════════════════════ */
  {
    id: 'a2_maths', level: 'a2', name: 'Mathematics', icon: '∑',
    color: '#9333ea', syllabus: '9709',
    topics: [
      { name: 'Pure 3', subtopics: ['Advanced algebra', 'Logarithms & exponentials', 'Advanced trigonometry', 'Differentiation techniques', 'Integration techniques', 'Vectors', 'Complex numbers', 'Differential equations', 'Numerical methods'] },
      { name: 'Statistics 2', subtopics: ['Poisson distribution', 'Linear combinations of variables', 'Continuous random variables', 'Sampling & estimation', 'Hypothesis testing'] },
      { name: 'Mechanics 2', subtopics: ['Projectiles', 'Equilibrium of rigid bodies', 'Circular motion', "Hooke's law", 'Moments'] },
    ],
  },
  {
    id: 'a2_fm', level: 'a2', name: 'Further Mathematics', icon: '∞',
    color: '#6d28d9', syllabus: '9231',
    topics: [
      { name: 'Further Pure 3', subtopics: ['Advanced differential equations', 'Complex numbers & Argand diagrams', 'Group theory', 'Proof by induction', 'Arc length & surface area'] },
      { name: 'Further Pure 4', subtopics: ['Vectors & matrices in 3D', 'Advanced integration', 'Series & convergence', 'Number theory & modular arithmetic'] },
      { name: 'Further Statistics 2', subtopics: ['Probability generating functions', 'Advanced inference', 'Non-parametric tests', 'Chi-squared tests'] },
      { name: 'Further Mechanics 2', subtopics: ['Rotational dynamics', 'Stability & centres of mass', 'Collisions in 2D', 'Variable mass problems'] },
    ],
  },
  {
    id: 'a2_econ', level: 'a2', name: 'Economics', icon: '📊',
    color: '#0e7490', syllabus: '9708',
    topics: [
      { name: 'Advanced Microeconomics', subtopics: ['Perfect competition vs monopoly', 'Oligopoly & game theory', 'Labour markets & wages', 'Welfare economics & Pareto efficiency'] },
      { name: 'Advanced Macroeconomics', subtopics: ['Quantity theory of money', 'Supply-side policies', 'International economics & trade theory', 'Development economics', 'Policy conflicts & evaluation'] },
    ],
  },
  {
    id: 'a2_englit', level: 'a2', name: 'English Literature', icon: '📚',
    color: '#be185d', syllabus: '9695',
    topics: [
      { name: 'Literary Criticism', subtopics: ['Critical theories', 'Feminist & gender criticism', 'Marxist criticism', 'Post-colonial criticism'] },
      { name: 'Comparative Study', subtopics: ['Cross-genre comparison', 'Thematic links', 'Style, form & structure', 'Contextual comparison'] },
      { name: 'Set Texts', subtopics: ['Prose set texts', 'Drama set texts', 'Poetry collections'] },
    ],
  },
  {
    id: 'a2_englang', level: 'a2', name: 'English Language', icon: '✒️',
    color: '#be123c', syllabus: '9093',
    topics: [
      { name: 'Language in Context', subtopics: ['Sociolinguistics', 'Language change over time', 'Language & power', 'Language acquisition'] },
      { name: 'Advanced Writing', subtopics: ['Crafting arguments', 'Stylistic choices & voice', 'Genre manipulation', 'Commentary writing'] },
    ],
  },
  {
    id: 'a2_bio', level: 'a2', name: 'Biology', icon: '🔬',
    color: '#15803d', syllabus: '9700',
    topics: [
      { name: 'Homeostasis & Control', subtopics: ['Nervous system & synapses', 'Hormonal coordination', 'Osmoregulation & kidney', 'Thermoregulation'] },
      { name: 'Genetics & Biotechnology', subtopics: ['Gene technology & PCR', 'Genome sequencing', 'Recombinant DNA', 'Cloning', 'Ethical issues'] },
      { name: 'Immunity & Disease', subtopics: ['Immune response', 'Antibodies & B/T cells', 'Vaccines', 'Monoclonal antibodies'] },
      { name: 'Evolution & Populations', subtopics: ['Hardy-Weinberg principle', 'Speciation', 'Allelic frequency & selection', 'Conservation'] },
    ],
  },
  {
    id: 'a2_chem', level: 'a2', name: 'Chemistry', icon: '⚗️',
    color: '#b45309', syllabus: '9701',
    topics: [
      { name: 'Advanced Physical', subtopics: ['Entropy & Gibbs free energy', 'Electrode potentials', 'Advanced kinetics & rate equations', 'Acid-base equilibria & buffers', 'Complex ions & ligands'] },
      { name: 'Advanced Inorganic', subtopics: ['Transition metal chemistry', 'Redox in industry', 'Reactions & mechanisms review'] },
      { name: 'Advanced Organic', subtopics: ['Benzene & electrophilic substitution', 'Carbonyl compounds', 'Amines & amino acids', 'Polymers & condensation', 'Organic synthesis', 'NMR & spectroscopy'] },
    ],
  },
  {
    id: 'a2_phys', level: 'a2', name: 'Physics', icon: '⚛️',
    color: '#1d4ed8', syllabus: '9702',
    topics: [
      { name: 'Circular & Oscillatory Motion', subtopics: ['Circular motion (angular velocity)', 'Simple harmonic motion', 'Resonance & damping'] },
      { name: 'Thermal & Gas Physics', subtopics: ['Internal energy & temperature', 'Ideal gas equations', 'Kinetic model of gases'] },
      { name: 'Fields', subtopics: ['Gravitational fields', 'Electric fields & potential', 'Capacitance', 'Magnetic fields', 'Electromagnetic induction'] },
      { name: 'Nuclear & Quantum Physics', subtopics: ['Radioactive decay equations', 'Nuclear binding energy', 'Photoelectric effect', 'Wave-particle duality', 'Energy levels'] },
    ],
  },
  {
    id: 'a2_cs', level: 'a2', name: 'Computer Science', icon: '💻',
    color: '#5b21b6', syllabus: '9618',
    topics: [
      { name: 'Theory of Computation', subtopics: ['Finite state machines', 'Turing machines & computability', 'Regular expressions', 'Context-free grammars'] },
      { name: 'Advanced Programming', subtopics: ['Recursion & stacks', 'Trees, graphs & traversal', 'Advanced sorting & searching', 'Dynamic programming'] },
      { name: 'Systems & Architecture', subtopics: ['Operating systems internals', 'Network protocols', 'Processor architectures', 'Parallel processing'] },
      { name: 'AI & Emerging Tech', subtopics: ['Machine learning fundamentals', 'Neural networks', 'AI applications', 'Ethical implications'] },
    ],
  },
  {
    id: 'a2_hist', level: 'a2', name: 'History', icon: '🏛️',
    color: '#991b1b', syllabus: '9489',
    topics: [
      { name: 'Advanced Historical Skills', subtopics: ['Extended essay technique', 'Historiographical debate', 'Complex causation', 'Significance & change'] },
      { name: 'Modern World History', subtopics: ['Cold War development & crises', 'Decolonisation', 'Rise of nationalism', 'Genocide, human rights & the UN'] },
    ],
  },
  {
    id: 'a2_geog', level: 'a2', name: 'Geography', icon: '🌍',
    color: '#065f46', syllabus: '9696',
    topics: [
      { name: 'Advanced Physical', subtopics: ['Climate systems & change', 'Tectonic hazard management', 'Geomorphological processes', 'Ecosystem management'] },
      { name: 'Advanced Human', subtopics: ['Global production networks', 'Environmental management', 'Urban futures', 'Development, aid & inequality'] },
    ],
  },
];

/* ── Active subject management ──────────────────────────────────── */
const ACTIVE_SUBJECTS_KEY = 'rp-active-subjects';

function getActiveSubjectIds() {
  const stored = localStorage.getItem(ACTIVE_SUBJECTS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch(e) {}
  }
  return ALL_SUBJECTS.map(s => s.id); // default: all
}
function setActiveSubjectIds(ids) {
  localStorage.setItem(ACTIVE_SUBJECTS_KEY, JSON.stringify(ids));
}
function isSubjectActive(id) { return getActiveSubjectIds().includes(id); }
function toggleSubject(id) {
  const ids = getActiveSubjectIds();
  const idx = ids.indexOf(id);
  if (idx === -1) ids.push(id); else ids.splice(idx, 1);
  setActiveSubjectIds(ids);
}

/* ── Computed maps ───────────────────────────────────────────────── */
const SUBJECT_MAP = Object.fromEntries(ALL_SUBJECTS.map(s => [s.id, s]));
const LEVEL_MAP   = Object.fromEntries(LEVELS.map(l => [l.id, l]));

// SUBJECTS = active subjects only (backward compat)
Object.defineProperty(window, 'SUBJECTS', {
  configurable: true,
  get() { return ALL_SUBJECTS.filter(s => isSubjectActive(s.id)); },
});

/* ── Questions bank ─────────────────────────────────────────────── */
const QUESTIONS = [
  // ── AS Physics ──────────────────────────────────────────────────
  {
    id: 'q001', subject: 'as_phys', topic: 'Kinematics & Dynamics', subtopic: 'SUVAT & projectile motion',
    questionType: 'mcq', difficulty: 'easy', marks: 1,
    prompt: 'A car accelerates uniformly from rest to 20 m/s in 5 seconds. What is its acceleration?',
    options: ['2 m/s²', '4 m/s²', '5 m/s²', '10 m/s²'],
    correctAnswer: 1,
    markScheme: ['a = Δv/t = (20 – 0)/5 = 4 m/s²'],
    explanation: 'Using a = Δv/Δt, acceleration = change in velocity ÷ time.',
    tags: ['kinematics'],
  },
  {
    id: 'q002', subject: 'as_phys', topic: 'Waves', subtopic: 'Wave properties & equations',
    questionType: 'mcq', difficulty: 'easy', marks: 1,
    prompt: 'Which of the following is a longitudinal wave?',
    options: ['Light', 'Water wave', 'Sound', 'Radio wave'],
    correctAnswer: 2,
    markScheme: ['Sound is longitudinal — particles vibrate parallel to wave direction'],
    explanation: 'Longitudinal waves have oscillations parallel to the direction of propagation.',
    tags: ['waves'],
  },
  {
    id: 'q003', subject: 'as_phys', topic: 'Electricity', subtopic: 'Resistance & resistivity',
    questionType: 'calculation', difficulty: 'medium', marks: 3,
    prompt: 'A wire of length 2.0 m and cross-sectional area 1.5 × 10⁻⁶ m² has a resistance of 4.0 Ω. Calculate the resistivity of the material.',
    correctAnswer: '3.0e-6',
    markScheme: ['ρ = RA/L', '= 4.0 × (1.5 × 10⁻⁶) / 2.0', '= 3.0 × 10⁻⁶ Ω·m'],
    explanation: 'Resistivity ρ = RA/L.',
    tags: ['electricity', 'resistivity'],
  },
  {
    id: 'q004', subject: 'as_phys', topic: 'Physical Quantities & Measurement', subtopic: 'Uncertainty & error analysis',
    questionType: 'short-answer', difficulty: 'medium', marks: 4,
    prompt: 'Explain the difference between systematic error and random error. Give one example of each.',
    markScheme: [
      'Systematic error: consistent shift in all readings in one direction [1]',
      'Cannot be reduced by repeating measurements [1]',
      'Example: zero error on a micrometer [1]',
      'Random error: unpredictable variation between repeated readings [1]',
      'Example: human reaction time with a stopwatch [1]',
    ],
    explanation: 'Systematic errors bias all values the same way; random errors cause scatter around the true value.',
    tags: ['uncertainty', 'errors'],
  },
  {
    id: 'q005', subject: 'as_phys', topic: 'Kinematics & Dynamics', subtopic: "Newton's laws",
    questionType: 'essay', difficulty: 'hard', marks: 6,
    prompt: "Explain Newton's three laws of motion with a real-world example for each, and discuss how they underpin conservation of momentum.",
    markScheme: [
      "Newton's First Law: object remains at rest/uniform motion unless net force acts [1]",
      'Example: seatbelt during emergency stop [1]',
      "Newton's Second Law: F = ma / F = rate of change of momentum [1]",
      'Example: greater force gives greater acceleration [1]',
      "Newton's Third Law: equal and opposite reaction [1]",
      'Example: rocket propulsion [1]',
      'Third law → internal forces cancel → momentum conserved in isolated system [1]',
    ],
    explanation: "Newton's laws are the foundation of classical mechanics.",
    tags: ["Newton's laws", 'momentum'],
  },
  // ── AS Maths ────────────────────────────────────────────────────
  {
    id: 'q006', subject: 'as_maths', topic: 'Pure 1', subtopic: 'Quadratics',
    questionType: 'mcq', difficulty: 'easy', marks: 1,
    prompt: 'Which condition gives two distinct real roots for ax² + bx + c = 0?',
    options: ['b² – 4ac < 0', 'b² – 4ac = 0', 'b² – 4ac > 0', 'b² – 4ac ≥ 0'],
    correctAnswer: 2,
    markScheme: ['b² – 4ac > 0 means two distinct real roots'],
    explanation: 'When the discriminant is positive, the quadratic has two different real solutions.',
    tags: ['quadratics', 'discriminant'],
  },
  {
    id: 'q007', subject: 'as_maths', topic: 'Pure 1', subtopic: 'Differentiation',
    questionType: 'calculation', difficulty: 'medium', marks: 4,
    prompt: 'Find the stationary points of y = 2x³ – 9x² + 12x – 4 and determine their nature.',
    correctAnswer: '(1,1) max and (2,0) min',
    markScheme: [
      'dy/dx = 6x² – 18x + 12',
      'Set = 0: x² – 3x + 2 = 0 → x = 1 or x = 2',
      'x=1: y=1 → point (1,1); x=2: y=0 → point (2,0)',
      'd²y/dx² = 12x – 18. At x=1: –6 < 0 → maximum. At x=2: +6 > 0 → minimum',
    ],
    explanation: 'Set dy/dx = 0, solve, then use the second derivative test.',
    tags: ['differentiation', 'stationary points'],
  },
  {
    id: 'q008', subject: 'as_maths', topic: 'Statistics 1', subtopic: 'Normal distribution',
    questionType: 'calculation', difficulty: 'hard', marks: 5,
    prompt: 'X ~ N(50, 16). Find P(46 < X < 58) to 4 decimal places.',
    correctAnswer: '0.8185',
    markScheme: [
      'Standardise: Z = (X – 50)/4',
      'P(46 < X < 58) = P(–1 < Z < 2)',
      '= Φ(2) – Φ(–1) = 0.9772 – 0.1587 = 0.8185',
    ],
    explanation: 'Convert to Z-scores then use standard normal tables.',
    tags: ['normal distribution'],
  },
  // ── IGCSE Biology ───────────────────────────────────────────────
  {
    id: 'q009', subject: 'igcse_bio', topic: 'Cell Biology', subtopic: 'Animal & plant cells',
    questionType: 'mcq', difficulty: 'easy', marks: 1,
    prompt: 'Which organelle is responsible for photosynthesis in plant cells?',
    options: ['Mitochondria', 'Ribosome', 'Chloroplast', 'Vacuole'],
    correctAnswer: 2,
    markScheme: ['Chloroplasts contain chlorophyll and are the site of photosynthesis'],
    explanation: 'Chloroplasts are unique to plant cells and contain the pigment chlorophyll.',
    tags: ['cells', 'organelles'],
  },
  {
    id: 'q010', subject: 'igcse_bio', topic: 'Enzymes & Nutrition', subtopic: 'Enzyme action',
    questionType: 'short-answer', difficulty: 'medium', marks: 4,
    prompt: 'Explain how pH affects enzyme activity. Include reference to the active site.',
    markScheme: [
      'Enzymes have an optimum pH [1]',
      'Above/below optimum, activity decreases [1]',
      'Extreme pH alters bonds in the enzyme\'s tertiary structure [1]',
      'Active site changes shape — substrate cannot bind (denaturation) [1]',
    ],
    explanation: 'pH affects the ionisation of amino acids in the active site, altering its 3D shape.',
    tags: ['enzymes', 'pH'],
  },
  {
    id: 'q011', subject: 'igcse_bio', topic: 'Respiration & Gas Exchange', subtopic: 'Aerobic respiration',
    questionType: 'mcq', difficulty: 'easy', marks: 1,
    prompt: 'What are the products of aerobic respiration?',
    options: ['Water only', 'Carbon dioxide and lactic acid', 'Carbon dioxide and water', 'Glucose and oxygen'],
    correctAnswer: 2,
    markScheme: ['C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O (+ATP)'],
    explanation: 'Aerobic respiration breaks down glucose using oxygen, producing CO₂ and water.',
    tags: ['respiration'],
  },
  // ── IGCSE Chemistry ─────────────────────────────────────────────
  {
    id: 'q012', subject: 'igcse_chem', topic: 'Stoichiometry', subtopic: 'Moles',
    questionType: 'calculation', difficulty: 'medium', marks: 3,
    prompt: 'Calculate the moles in 11 g of CO₂. [Ar: C=12, O=16]',
    correctAnswer: '0.25',
    markScheme: [
      'M(CO₂) = 12 + 32 = 44 g/mol',
      'n = 11/44 = 0.25 mol',
    ],
    explanation: 'Moles = mass ÷ molar mass.',
    tags: ['moles'],
  },
  {
    id: 'q013', subject: 'igcse_chem', topic: 'Bonding & Structure', subtopic: 'Ionic bonding',
    questionType: 'short-answer', difficulty: 'medium', marks: 4,
    prompt: 'Describe ionic bond formation between Na and Cl, and explain why NaCl has a high melting point.',
    markScheme: [
      'Na loses one electron → Na⁺ [1]',
      'Cl gains one electron → Cl⁻ [1]',
      'Electrostatic attraction between ions forms the bond [1]',
      'Giant ionic lattice — many strong forces require high energy to overcome → high mp [1]',
    ],
    explanation: 'Ionic bonds form by electron transfer. The lattice structure means all bonds must be broken simultaneously.',
    tags: ['bonding', 'ionic'],
  },
  // ── IGCSE Economics ─────────────────────────────────────────────
  {
    id: 'q014', subject: 'igcse_econ', topic: 'Demand & Supply', subtopic: 'Elasticities (PED, PES, YED, XED)',
    questionType: 'mcq', difficulty: 'easy', marks: 1,
    prompt: 'Price rises 10%, quantity demanded falls 20%. What is PED?',
    options: ['–0.5', '–2', '2', '0.5'],
    correctAnswer: 1,
    markScheme: ['PED = %ΔQd / %ΔP = –20/10 = –2'],
    explanation: 'PED = %ΔQd ÷ %ΔP. Value of –2 indicates elastic demand.',
    tags: ['elasticity', 'PED'],
  },
  {
    id: 'q015', subject: 'igcse_econ', topic: 'Macroeconomics', subtopic: 'Inflation',
    questionType: 'essay', difficulty: 'hard', marks: 8,
    prompt: 'Evaluate the causes and effects of high inflation in a developing economy, considering both demand-pull and cost-push inflation.',
    markScheme: [
      'Definition: sustained rise in general price level [1]',
      'Demand-pull: excess AD (consumer boom, government spending) [2]',
      'Cost-push: rising input costs (wages, oil prices) [2]',
      'Effects: erodes purchasing power, hurts savers, redistributes income [2]',
      'Developing economy: imported inflation, weak monetary tools [2]',
      'Policy responses: interest rates, supply-side reform [1]',
      'Evaluation of relative significance [1]',
    ],
    explanation: 'Inflation in developing economies is often amplified by structural weaknesses.',
    tags: ['inflation', 'macroeconomics'],
  },
  // ── IGCSE English Literature ─────────────────────────────────────
  {
    id: 'q016', subject: 'igcse_englit', topic: 'Critical Writing', subtopic: 'PEE paragraphs',
    questionType: 'short-answer', difficulty: 'medium', marks: 4,
    prompt: 'Explain the PEE structure for analytical paragraphs. What does each letter stand for and why is the final E the most important?',
    markScheme: [
      'P = Point: the analytical argument you are making [1]',
      'E = Evidence: a quotation or reference from the text [1]',
      'E = Explanation: analysis of HOW the evidence supports the point [1]',
      'Final E most important: shows critical thinking, not just summary [1]',
    ],
    explanation: 'PEE forces you to analyse rather than describe. The explanation is where marks are earned.',
    tags: ['essay writing', 'structure'],
  },
];

/* ── Merge past-paper questions from export ─────────────────────── */
if (typeof DB_QUESTIONS !== 'undefined') {
  QUESTIONS.push(...DB_QUESTIONS);
}

/* ── Question map & helpers ─────────────────────────────────────── */
let QUESTION_MAP = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

function filterQuestions(subjectId, filters = {}) {
  let qs = QUESTIONS.filter(q => q.subject === subjectId);
  if (filters.topic)      qs = qs.filter(q => q.topic === filters.topic);
  if (filters.subtopic)   qs = qs.filter(q => q.subtopic === filters.subtopic);
  if (filters.difficulty) qs = qs.filter(q => q.difficulty === filters.difficulty);
  if (filters.type)       qs = qs.filter(q => q.questionType === filters.type);
  return qs;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getTopicsForSubject(subjectId) {
  const s = SUBJECT_MAP[subjectId];
  if (!s) return [];
  return s.topics.flatMap(t => [t.name, ...t.subtopics]);
}

function getPapersForSubject(subjectId) {
  const qs = QUESTIONS.filter(q => q.subject === subjectId);
  return [...new Set(qs.map(q => q.paper).filter(Boolean))];
}

function getSubjectSyllabusContext(subjectId) {
  const s = SUBJECT_MAP[subjectId];
  if (!s) return '';
  const topicList = s.topics.map(t =>
    `  ${t.name}:\n    - ${t.subtopics.join('\n    - ')}`
  ).join('\n');
  const level = LEVEL_MAP[s.level]?.name || s.level;
  return `Subject: ${s.name} (${level})\nSyllabus code: ${s.syllabus}\n\nTopics:\n${topicList}`;
}
