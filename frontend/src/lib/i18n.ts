export const LANGUAGES = [
  { id: "en", label: "en", name: "English" },
  { id: "fr", label: "fr", name: "Français" },
  { id: "es", label: "es", name: "Español" },
  { id: "de", label: "de", name: "Deutsch" },
  { id: "pt", label: "pt", name: "Português" },
] as const;

export type LangId = (typeof LANGUAGES)[number]["id"];

export type JointName = "left_wrist" | "right_wrist" | "left_ankle" | "right_ankle";

export type Copy = {
  motto: string;
  language: string;
  themeToDark: string;
  themeToLight: string;
  shortHold: string;
  longHold: string;
  demoClip: string;
  recognizedBy: (model: string) => string;
  recognized: string;
  selected: string;
  highPlank: string;
  yourVideo: string;
  correctedForm: string;
  pikingHips: string;
  saggingHips: string;
  severity: Record<"minor" | "moderate" | "major", string>;
  engineeringLabel: string;
  angleMeter: string;
  coach: string;
  yours: (degrees: string, pose: string) => string;
  corrected: (degrees: string) => string;
  target: (from: number, to: number) => string;
  straight: string;
  sameClip: string;
  lineGap: (peak: string, corrected: string) => string;
  report: string;
  reportTitle: string;
  reportLead: string;
  reportPrint: string;
  reportClose: string;
  holdLength: (seconds: string) => string;
  peakHip: (offset: string, meter: string, pose: string) => string;
  outsideBand: (percent: string) => string;
  worstFrame: string;
  coachLines: string;
  pose: Record<"pike" | "sag" | "straight", string>;
  noReliableAngle: string;
  cueUnavailable: string;
  writingCue: string;
  loadingAnalysis: string;
  noAnalysis: string;
  findingJoints: string;
  correctedWillAppear: string;
  noAngleYet: string;
  noCueYet: string;
  analysisFailed: string;
  exampleBanner: string;
  safetyStop: string;
  rerecord: string;
  clipMissing: string;
  correctedHidden: string;
  notCorrected: string;
  analyzing: (percent: number) => string;
  lowConfidence: (joints: string, singular: boolean) => string;
  joints: Record<JointName, string>;
  and: string;
  contractKeypoints: string;
  contractMismatch: string;
  jobFailed: (status: number) => string;
  jobUnreadable: string;
};

export function isLang(value: string | null): value is LangId {
  return LANGUAGES.some((item) => item.id === value);
}

const en: Copy = {
  motto: "Form meets precision.",
  language: "Language",
  themeToDark: "Switch to dark mode",
  themeToLight: "Switch to light mode",
  shortHold: "Short hold",
  longHold: "Long hold",
  demoClip: "Demo clip",
  recognizedBy: (model) => `Movement recognized by ${model} through the AMD API.`,
  recognized: "Movement recognized.",
  selected: "Movement selected.",
  highPlank: "High plank",
  yourVideo: "YOUR VIDEO",
  correctedForm: "CORRECTED FORM",
  pikingHips: "Piking hips",
  saggingHips: "Sagging hips",
  severity: { minor: "minor", moderate: "moderate", major: "major" },
  engineeringLabel: "Engineering label, not a medical risk.",
  angleMeter: "ANGLE METER",
  coach: "COACH",
  yours: (degrees, pose) => `Yours ${degrees}° (${pose}).`,
  corrected: (degrees) => `Corrected ${degrees}°.`,
  target: (from, to) => `Provisional target ${from}° to ${to}° offset.`,
  straight: "Straight is 180°.",
  sameClip: "Same clip. Hip corrected.",
  lineGap: (peak, corrected) =>
    `At the worst moment the hip is ${peak}% of the shoulder–ankle line away from straight. The corrected pose brings that to ${corrected}%.`,
  report: "Report",
  reportTitle: "Form explanation",
  reportLead: "A form explanation of this recorded hold.",
  reportPrint: "Print",
  reportClose: "Close",
  holdLength: (seconds) => `Hold length ${seconds} s.`,
  peakHip: (offset, meter, pose) =>
    `Peak hip offset ${offset}° (${pose}). On the meter that is ${meter}°.`,
  outsideBand: (percent) => `${percent}% of the hold is outside that band.`,
  worstFrame: "Worst frame",
  coachLines: "Coach lines",
  pose: { pike: "pike", sag: "sag", straight: "straight" },
  noReliableAngle: "No reliable angle for this frame.",
  cueUnavailable: "Cue unavailable.",
  writingCue: "Writing the cue.",
  loadingAnalysis: "Loading analysis…",
  noAnalysis: "No analysis yet.",
  findingJoints: "Finding the joints, then the corrected movement.",
  correctedWillAppear: "The corrected movement will appear here, aligned at the hips.",
  noAngleYet:
    "No angle yet. The meter shows your value against the target range while the clip plays. Straight is 180°. The target band is provisional.",
  noCueYet: "No cue yet.",
  analysisFailed: "Analysis failed.",
  exampleBanner: "Example. This is not a live analysis.",
  safetyStop: "Stop and consult a qualified professional.",
  rerecord: "Record the plank again from the side. This measurement is not reliable.",
  clipMissing: "The clip file is not part of this result.",
  correctedHidden: "Corrected form hidden.",
  notCorrected: "Not corrected on this frame.",
  analyzing: (percent) => `Analyzing… ${percent}%.`,
  lowConfidence: (joints, singular) =>
    `Low-confidence ${joints}. ${singular ? "That point is" : "Those points are"} not used for the corrected pose.`,
  joints: {
    left_wrist: "left wrist",
    right_wrist: "right wrist",
    left_ankle: "left ankle",
    right_ankle: "right ankle",
  },
  and: "and",
  contractKeypoints: "This result does not have 17 keypoints.",
  contractMismatch: "This result does not match the contract.",
  jobFailed: (status) => `Job request failed (${status}).`,
  jobUnreadable: "The job could not be read.",
};

const fr: Copy = {
  motto: "La forme, avec précision.",
  language: "Langue",
  themeToDark: "Passer au mode sombre",
  themeToLight: "Passer au mode clair",
  shortHold: "Prise courte",
  longHold: "Prise longue",
  demoClip: "Extrait de démo",
  recognizedBy: (model) => `Mouvement reconnu par ${model} via l'API AMD.`,
  recognized: "Mouvement reconnu.",
  selected: "Mouvement sélectionné.",
  highPlank: "Planche haute",
  yourVideo: "VOTRE VIDÉO",
  correctedForm: "FORME CORRIGÉE",
  pikingHips: "Hanches en pike",
  saggingHips: "Hanches qui s'affaissent",
  severity: { minor: "légère", moderate: "modérée", major: "importante" },
  engineeringLabel: "Indication technique, pas un risque médical.",
  angleMeter: "ANGLE",
  coach: "CONSEIL",
  yours: (degrees, pose) => `La vôtre ${degrees}° (${pose}).`,
  corrected: (degrees) => `Corrigée ${degrees}°.`,
  target: (from, to) => `Cible provisoire : écart de ${from}° à ${to}°.`,
  straight: "Droit à 180°.",
  sameClip: "Même extrait. Hanche corrigée.",
  lineGap: (peak, corrected) =>
    `Au moment le plus écarté, la hanche est à ${peak} % de la ligne épaule–cheville. La forme corrigée ramène cela à ${corrected} %.`,
  report: "Rapport",
  reportTitle: "Explication de la forme",
  reportLead: "Une explication de la forme pour cette prise enregistrée.",
  reportPrint: "Imprimer",
  reportClose: "Fermer",
  holdLength: (seconds) => `Durée de la prise ${seconds} s.`,
  peakHip: (offset, meter, pose) =>
    `Écart maximal des hanches ${offset}° (${pose}). Sur le compteur, cela fait ${meter}°.`,
  outsideBand: (percent) => `${percent} % de la prise est hors de cette plage.`,
  worstFrame: "Image la plus éloignée",
  coachLines: "Lignes du conseil",
  pose: { pike: "pike", sag: "affaissement", straight: "droit" },
  noReliableAngle: "Pas d'angle fiable pour cette image.",
  cueUnavailable: "Consigne indisponible.",
  writingCue: "Rédaction de la consigne.",
  loadingAnalysis: "Analyse en cours…",
  noAnalysis: "Pas encore d'analyse.",
  findingJoints: "Repérage des articulations, puis du mouvement corrigé.",
  correctedWillAppear: "Le mouvement corrigé apparaîtra ici, aligné aux hanches.",
  noAngleYet:
    "Pas encore d'angle. Le compteur montre votre valeur face à la plage cible pendant la lecture. Droit vaut 180°. La plage cible est provisoire.",
  noCueYet: "Pas encore de consigne.",
  analysisFailed: "L'analyse a échoué.",
  exampleBanner: "Exemple. Ce n'est pas une analyse en direct.",
  safetyStop: "Arrêtez-vous et consultez un professionnel qualifié.",
  rerecord: "Filmez à nouveau la planche de profil. Cette mesure n'est pas fiable.",
  clipMissing: "Le fichier vidéo ne fait pas partie de ce résultat.",
  correctedHidden: "Forme corrigée masquée.",
  notCorrected: "Pas de correction sur cette image.",
  analyzing: (percent) => `Analyse… ${percent} %.`,
  lowConfidence: (joints, singular) =>
    `Confiance faible pour ${joints}. ${singular ? "Ce point n'est pas utilisé" : "Ces points ne sont pas utilisés"} pour la pose corrigée.`,
  joints: {
    left_wrist: "Poignet gauche",
    right_wrist: "Poignet droit",
    left_ankle: "Cheville gauche",
    right_ankle: "Cheville droite",
  },
  and: "et",
  contractKeypoints: "Ce résultat n'a pas 17 points.",
  contractMismatch: "Ce résultat ne correspond pas au contrat.",
  jobFailed: (status) => `La demande a échoué (${status}).`,
  jobUnreadable: "Le résultat n'a pas pu être lu.",
};

const de: Copy = {
  motto: "Form trifft Präzision.",
  language: "Sprache",
  themeToDark: "Zum dunklen Modus wechseln",
  themeToLight: "Zum hellen Modus wechseln",
  shortHold: "Kurzes Halten",
  longHold: "Langes Halten",
  demoClip: "Demo-Clip",
  recognizedBy: (model) => `Bewegung erkannt von ${model} über die AMD-API.`,
  recognized: "Bewegung erkannt.",
  selected: "Bewegung ausgewählt.",
  highPlank: "Hohe Plank",
  yourVideo: "IHR VIDEO",
  correctedForm: "KORRIGIERTE FORM",
  pikingHips: "Hüften im Pike",
  saggingHips: "Durchhängende Hüften",
  severity: { minor: "gering", moderate: "mittel", major: "stark" },
  engineeringLabel: "Technische Bezeichnung, kein medizinisches Risiko.",
  angleMeter: "WINKEL",
  coach: "COACH",
  yours: (degrees, pose) => `Ihre ${degrees}° (${pose}).`,
  corrected: (degrees) => `Korrigiert ${degrees}°.`,
  target: (from, to) => `Vorläufiges Ziel: Versatz ${from}° bis ${to}°.`,
  straight: "Gerade ist 180°.",
  sameClip: "Derselbe Clip. Hüfte korrigiert.",
  lineGap: (peak, corrected) =>
    `Im stärksten Moment steht die Hüfte ${peak} % der Schulter-Knöchel-Linie von der Geraden weg. Die korrigierte Haltung bringt das auf ${corrected} %.`,
  report: "Bericht",
  reportTitle: "Formerklärung",
  reportLead: "Eine Formerklärung dieser aufgenommenen Halteposition.",
  reportPrint: "Drucken",
  reportClose: "Schließen",
  holdLength: (seconds) => `Haltedauer ${seconds} s.`,
  peakHip: (offset, meter, pose) =>
    `Größter Hüftversatz ${offset}° (${pose}). Auf der Anzeige sind das ${meter}°.`,
  outsideBand: (percent) => `${percent} % der Halteposition liegen außerhalb dieses Bereichs.`,
  worstFrame: "Weitestes Bild",
  coachLines: "Coach-Zeilen",
  pose: { pike: "Pike", sag: "Durchhängen", straight: "gerade" },
  noReliableAngle: "Kein zuverlässiger Winkel für dieses Bild.",
  cueUnavailable: "Hinweis nicht verfügbar.",
  writingCue: "Hinweis wird geschrieben.",
  loadingAnalysis: "Analyse wird geladen…",
  noAnalysis: "Noch keine Analyse.",
  findingJoints: "Zuerst die Gelenke, dann die korrigierte Bewegung.",
  correctedWillAppear: "Die korrigierte Bewegung erscheint hier, an den Hüften ausgerichtet.",
  noAngleYet:
    "Noch kein Winkel. Die Anzeige zeigt Ihren Wert gegen den Zielbereich, während der Clip läuft. Gerade ist 180°. Der Zielbereich ist vorläufig.",
  noCueYet: "Noch kein Hinweis.",
  analysisFailed: "Die Analyse ist fehlgeschlagen.",
  exampleBanner: "Beispiel. Dies ist keine Live-Analyse.",
  safetyStop: "Halten Sie an und fragen Sie eine qualifizierte Fachperson.",
  rerecord: "Nehmen Sie die Plank erneut von der Seite auf. Diese Messung ist nicht zuverlässig.",
  clipMissing: "Die Videodatei gehört nicht zu diesem Ergebnis.",
  correctedHidden: "Korrigierte Form ausgeblendet.",
  notCorrected: "Auf diesem Bild nicht korrigiert.",
  analyzing: (percent) => `Analyse… ${percent} %.`,
  lowConfidence: (joints, singular) =>
    `Geringe Sicherheit: ${joints}. ${singular ? "Dieser Punkt wird" : "Diese Punkte werden"} für die korrigierte Pose nicht verwendet.`,
  joints: {
    left_wrist: "linkes Handgelenk",
    right_wrist: "rechtes Handgelenk",
    left_ankle: "linker Knöchel",
    right_ankle: "rechter Knöchel",
  },
  and: "und",
  contractKeypoints: "Dieses Ergebnis hat keine 17 Punkte.",
  contractMismatch: "Dieses Ergebnis entspricht nicht dem Vertrag.",
  jobFailed: (status) => `Die Anfrage ist fehlgeschlagen (${status}).`,
  jobUnreadable: "Das Ergebnis konnte nicht gelesen werden.",
};

const es: Copy = {
  motto: "La forma, con precisión.",
  language: "Idioma",
  themeToDark: "Cambiar al modo oscuro",
  themeToLight: "Cambiar al modo claro",
  shortHold: "Aguante corto",
  longHold: "Aguante largo",
  demoClip: "Clip de demostración",
  recognizedBy: (model) => `Movimiento reconocido por ${model} a través de la API de AMD.`,
  recognized: "Movimiento reconocido.",
  selected: "Movimiento seleccionado.",
  highPlank: "Plancha alta",
  yourVideo: "TU VÍDEO",
  correctedForm: "FORMA CORREGIDA",
  pikingHips: "Caderas en pike",
  saggingHips: "Caderas caídas",
  severity: { minor: "leve", moderate: "moderada", major: "marcada" },
  engineeringLabel: "Etiqueta técnica, no un riesgo médico.",
  angleMeter: "ÁNGULO",
  coach: "GUÍA",
  yours: (degrees, pose) => `La tuya ${degrees}° (${pose}).`,
  corrected: (degrees) => `Corregido ${degrees}°.`,
  target: (from, to) => `Objetivo provisional: desvío de ${from}° a ${to}°.`,
  straight: "Recto es 180°.",
  sameClip: "El mismo clip. Cadera corregida.",
  lineGap: (peak, corrected) =>
    `En el momento más alejado, la cadera está a un ${peak} % de la línea hombro–tobillo. La forma corregida lo deja en ${corrected} %.`,
  report: "Informe",
  reportTitle: "Explicación de la forma",
  reportLead: "Una explicación de la forma de esta aguante grabada.",
  reportPrint: "Imprimir",
  reportClose: "Cerrar",
  holdLength: (seconds) => `Duración del aguante ${seconds} s.`,
  peakHip: (offset, meter, pose) =>
    `Desvío máximo de la cadera ${offset}° (${pose}). En el medidor son ${meter}°.`,
  outsideBand: (percent) => `${percent} % del aguante está fuera de ese rango.`,
  worstFrame: "Fotograma más alejado",
  coachLines: "Líneas de la guía",
  pose: { pike: "pike", sag: "caída", straight: "recto" },
  noReliableAngle: "No hay un ángulo fiable en este fotograma.",
  cueUnavailable: "Indicación no disponible.",
  writingCue: "Escribiendo la indicación.",
  loadingAnalysis: "Cargando el análisis…",
  noAnalysis: "Aún no hay análisis.",
  findingJoints: "Primero las articulaciones, luego el movimiento corregido.",
  correctedWillAppear: "El movimiento corregido aparecerá aquí, alineado en las caderas.",
  noAngleYet:
    "Aún no hay ángulo. El medidor muestra tu valor frente al rango objetivo mientras se reproduce. Recto es 180°. El rango es provisional.",
  noCueYet: "Aún no hay indicación.",
  analysisFailed: "El análisis falló.",
  exampleBanner: "Ejemplo. Esto no es un análisis en directo.",
  safetyStop: "Detente y consulta a un profesional cualificado.",
  rerecord: "Graba otra vez la plancha de lado. Esta medición no es fiable.",
  clipMissing: "El archivo de vídeo no forma parte de este resultado.",
  correctedHidden: "Forma corregida oculta.",
  notCorrected: "Sin corrección en este fotograma.",
  analyzing: (percent) => `Analizando… ${percent} %.`,
  lowConfidence: (joints, singular) =>
    `${joints} con poca confianza. ${singular ? "Ese punto no se usa" : "Esos puntos no se usan"} para la pose corregida.`,
  joints: {
    left_wrist: "muñeca izquierda",
    right_wrist: "muñeca derecha",
    left_ankle: "tobillo izquierdo",
    right_ankle: "tobillo derecho",
  },
  and: "y",
  contractKeypoints: "Este resultado no tiene 17 puntos.",
  contractMismatch: "Este resultado no coincide con el contrato.",
  jobFailed: (status) => `La solicitud falló (${status}).`,
  jobUnreadable: "No se pudo leer el resultado.",
};

const pt: Copy = {
  motto: "A forma, com precisão.",
  language: "Idioma",
  themeToDark: "Mudar para o modo escuro",
  themeToLight: "Mudar para o modo claro",
  shortHold: "Isometria curta",
  longHold: "Isometria longa",
  demoClip: "Clipe de demonstração",
  recognizedBy: (model) => `Movimento reconhecido por ${model} através da API da AMD.`,
  recognized: "Movimento reconhecido.",
  selected: "Movimento selecionado.",
  highPlank: "Prancha alta",
  yourVideo: "O SEU VÍDEO",
  correctedForm: "FORMA CORRIGIDA",
  pikingHips: "Ancas em pike",
  saggingHips: "Ancas descaídas",
  severity: { minor: "ligeira", moderate: "moderada", major: "marcada" },
  engineeringLabel: "Rótulo técnico, não um risco médico.",
  angleMeter: "ÂNGULO",
  coach: "ORIENTAÇÃO",
  yours: (degrees, pose) => `A sua ${degrees}° (${pose}).`,
  corrected: (degrees) => `Corrigido ${degrees}°.`,
  target: (from, to) => `Alvo provisório: desvio de ${from}° a ${to}°.`,
  straight: "Reto é 180°.",
  sameClip: "O mesmo clipe. Anca corrigida.",
  lineGap: (peak, corrected) =>
    `No momento mais afastado, a anca está a ${peak}% da linha ombro–tornozelo. A forma corrigida deixa isso em ${corrected}%.`,
  report: "Relatório",
  reportTitle: "Explicação da forma",
  reportLead: "Uma explicação da forma desta isometria gravada.",
  reportPrint: "Imprimir",
  reportClose: "Fechar",
  holdLength: (seconds) => `Duração da isometria ${seconds} s.`,
  peakHip: (offset, meter, pose) =>
    `Desvio máximo da anca ${offset}° (${pose}). No medidor são ${meter}°.`,
  outsideBand: (percent) => `${percent}% da isometria está fora desse intervalo.`,
  worstFrame: "Imagem mais afastada",
  coachLines: "Linhas da orientação",
  pose: { pike: "pike", sag: "descida", straight: "reto" },
  noReliableAngle: "Sem ângulo fiável nesta imagem.",
  cueUnavailable: "Indicação indisponível.",
  writingCue: "A escrever a indicação.",
  loadingAnalysis: "A carregar a análise…",
  noAnalysis: "Ainda sem análise.",
  findingJoints: "Primeiro as articulações, depois o movimento corrigido.",
  correctedWillAppear: "O movimento corrigido aparece aqui, alinhado nas ancas.",
  noAngleYet:
    "Ainda sem ângulo. O medidor mostra o seu valor face ao intervalo alvo enquanto o vídeo corre. Reto é 180°. O intervalo é provisório.",
  noCueYet: "Ainda sem indicação.",
  analysisFailed: "A análise falhou.",
  exampleBanner: "Exemplo. Isto não é uma análise em direto.",
  safetyStop: "Pare e consulte um profissional qualificado.",
  rerecord: "Grave a prancha outra vez de lado. Esta medição não é fiável.",
  clipMissing: "O ficheiro de vídeo não faz parte deste resultado.",
  correctedHidden: "Forma corrigida oculta.",
  notCorrected: "Sem correção nesta imagem.",
  analyzing: (percent) => `A analisar… ${percent} %.`,
  lowConfidence: (joints, singular) =>
    `${joints} com pouca confiança. ${singular ? "Esse ponto não é usado" : "Esses pontos não são usados"} para a pose corrigida.`,
  joints: {
    left_wrist: "pulso esquerdo",
    right_wrist: "pulso direito",
    left_ankle: "tornozelo esquerdo",
    right_ankle: "tornozelo direito",
  },
  and: "e",
  contractKeypoints: "Este resultado não tem 17 pontos.",
  contractMismatch: "Este resultado não corresponde ao contrato.",
  jobFailed: (status) => `O pedido falhou (${status}).`,
  jobUnreadable: "Não foi possível ler o resultado.",
};

export const COPY: Record<LangId, Copy> = { en, fr, de, es, pt };
