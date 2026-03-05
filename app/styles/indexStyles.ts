import { StyleSheet } from "react-native";

export const RESULT_BLOCK_HEIGHT = 132;
export const CHOICE_MIN_HEIGHT = 150;

export const styles = StyleSheet.create({
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

  // Chips
  chipsRow: {
    gap: 10,
    paddingVertical: 6,
    paddingRight: 6,
    alignItems: "center",
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#0F0F0F",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  chipText: {
    color: "#8E8E8E",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: 16,
  },

  // Answers
  answersFrame: {
    backgroundColor: "#111111",
    borderRadius: 22,
    borderWidth: 2,
    padding: 18,
    gap: 14,
  },
  categoryBadge: {
    color: "#9A9A9A",
    textAlign: "center",
    letterSpacing: 3,
    fontSize: 12,
    marginBottom: 2,
  },
  choice: {
    minHeight: CHOICE_MIN_HEIGHT,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#171717",
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

  // Result
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
    gap: 12,
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
  resultButtons: {
    flexDirection: "row",
    gap: 10,
  },
  resultBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtnText: {
    color: "#FFFFFF",
    letterSpacing: 2,
    fontSize: 12,
  },

  // Hidden share
  shareHidden: {
    position: "absolute",
    left: -9999,
    top: 0,
    width: 1080,
    height: 1920,
    opacity: 0,
  },

  // Share card layout (9:16-ish)
  shareCard: {
    width: 1080,
    height: 1920,
    backgroundColor: "#0B0B0B",
    padding: 64,
    gap: 24,
    justifyContent: "center",
  },
  shareTitle: {
    color: "#FFFFFF",
    fontSize: 52,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 8,
  },
  shareCategory: {
    fontSize: 26,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 12,
  },

  sharePickedBadge: {
    alignSelf: "center",
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 26,
    marginBottom: 16,
    backgroundColor: "#111111",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  sharePickedText: {
    fontSize: 28,
    letterSpacing: 4,
    fontWeight: "600",
  },

  shareFrame: {
    borderWidth: 4,
    borderRadius: 40,
    padding: 40,
    gap: 28,
    backgroundColor: "#0F0F0F",
  },
  shareChoice: {
    borderWidth: 2,
    borderColor: "#222222",
    borderRadius: 28,
    backgroundColor: "#141414",
    padding: 34,
    gap: 18,
  },
  shareChoiceLabel: {
    color: "#9A9A9A",
    textAlign: "center",
    letterSpacing: 8,
    fontSize: 22,
  },
  shareChoiceText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 44,
    lineHeight: 54,
  },
  sharePct: {
    color: "#9A9A9A",
    textAlign: "center",
    fontSize: 30,
    marginTop: 6,
  },
  shareOr: {
    color: "#777777",
    textAlign: "center",
    fontSize: 26,
    letterSpacing: 8,
  },
  shareFooter: {
    textAlign: "center",
    fontSize: 36,
    letterSpacing: 2,
    marginTop: 10,
  },
});