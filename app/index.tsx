import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

type Question = {
  id: string;
  a: string;
  b: string;
};

const questions: Question[] = [
  { id: "q1", a: "Always have a wet sock", b: "Always feel like you forgot something" },
  { id: "q2", a: "Send the wrong screenshot to the person you screenshotted", b: "Accidentally like your ex’s photo from 2016" },
  { id: "q3", a: "Laugh at the wrong moment at a funeral", b: "Call your teacher 'mom' in a meeting" },
];

const accents = ["#A259FF", "#39FF14", "#FF2D95", "#00E5FF"];

function clampIndex(i: number, len: number) {
  return ((i % len) + len) % len;
}

function fakePercents(seed: number) {
  const a = 42 + ((seed * 7) % 33);
  return { a, b: 100 - a };
}

const RESULT_BLOCK_HEIGHT = 132;
const CHOICE_MIN_HEIGHT = 150; // 👈 stabiliserar ramen

export default function Index() {
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<"A" | "B" | null>(null);

  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const RESULT_MS = 3000;

  const resultOpacity = useRef(new Animated.Value(0)).current;

  const q = useMemo(() => questions[clampIndex(index, questions.length)], [index]);
  const accent = useMemo(() => accents[clampIndex(index, accents.length)], [index]);
  const { a: percentA, b: percentB } = useMemo(() => fakePercents(index + 1), [index]);

  function clearTimer() {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }

  function nextQuestion() {
    clearTimer();

    Animated.timing(resultOpacity, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setPicked(null);
      setLocked(false);
      setIndex((i) => i + 1);
    });
  }

  function showResult(choice: "A" | "B") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPicked(choice);
    setLocked(true);

    Animated.timing(resultOpacity, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();

    nextTimerRef.current = setTimeout(() => {
      nextQuestion();
    }, RESULT_MS);
  }

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const aSelected = picked === "A";
  const bSelected = picked === "B";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WOULD YOU RATHER</Text>

      {/* ANSWERS FRAME */}
      <View style={[styles.answersFrame, { borderColor: accent }]}>
        <Pressable
          disabled={locked}
          onPress={() => showResult("A")}
          style={[
            styles.choice,
            aSelected && { borderColor: accent },
            locked && !aSelected && styles.choiceDim,
          ]}
        >
          <Text style={styles.choiceLabel}>A</Text>
          <Text style={styles.choiceText} numberOfLines={3}>
            {q.a}
          </Text>
        </Pressable>

        <Text style={styles.or}>OR</Text>

        <Pressable
          disabled={locked}
          onPress={() => showResult("B")}
          style={[
            styles.choice,
            bSelected && { borderColor: accent },
            locked && !bSelected && styles.choiceDim,
          ]}
        >
          <Text style={styles.choiceLabel}>B</Text>
          <Text style={styles.choiceText} numberOfLines={3}>
            {q.b}
          </Text>
        </Pressable>
      </View>

      {/* RESULT AREA (reserved space, invisible until pick) */}
      <View style={styles.resultSlot}>
        <Animated.View style={[styles.resultWrap, { opacity: resultOpacity }]}>
          <Pressable
            disabled={!picked}
            onPress={nextQuestion}
            style={[styles.resultCard, { borderColor: accent }]}
          >
            <Text style={styles.resultTitle}>RESULT</Text>

            <View style={styles.resultRow}>
              <Text style={[styles.resultPct, aSelected && { color: accent }]}>
                A: {percentA}%
              </Text>
              <Text style={[styles.resultPct, bSelected && { color: accent }]}>
                B: {percentB}%
              </Text>
            </View>

            <Text style={styles.resultFooter}>Tap to continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    justifyContent: "center",
    padding: 20,
    gap: 14,
  },
  title: {
    color: "white",
    fontSize: 22,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 2,
  },

  // Slightly darker frame so choices pop
  answersFrame: {
    backgroundColor: "#111111", // 👈 lite mörkare än knapparna
    borderRadius: 22,
    borderWidth: 2,
    padding: 18,
    gap: 14,
  },

  // Choice buttons: slightly lighter, close to frame color
  choice: {
    minHeight: CHOICE_MIN_HEIGHT, // 👈 stabil höjd
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#171717", // 👈 lite ljusare än ramen
    justifyContent: "center",
    gap: 10,
  },
  choiceDim: { opacity: 0.35 },

  choiceLabel: {
    color: "#9A9A9A",
    letterSpacing: 4,
    fontSize: 12,
    textAlign: "center",
  },
  choiceText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
  },
  or: {
    color: "#777",
    textAlign: "center",
    letterSpacing: 4,
  },

  resultSlot: {
    minHeight: RESULT_BLOCK_HEIGHT,
  },
  resultWrap: {
    flex: 1,
  },

  resultCard: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    backgroundColor: "#0B0B0B",
    gap: 10,
  },
  resultTitle: {
    color: "white",
    textAlign: "center",
    letterSpacing: 2,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  resultPct: {
    color: "#9A9A9A",
    fontSize: 16,
  },
  resultFooter: {
    color: "#9A9A9A",
    textAlign: "center",
  },
});
