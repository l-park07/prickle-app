import { StyleSheet, View } from "react-native";
import AppText from "../components/AppText";

export default function Index() {
  return (
    <View style={styles.container}>
      <AppText>is this font being used?</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f4e8",
    color: "#7f9174",
  },
});
