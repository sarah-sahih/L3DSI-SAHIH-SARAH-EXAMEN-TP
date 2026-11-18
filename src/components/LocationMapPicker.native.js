import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const DEFAULT_LOCATION = {
  latitude: 48.8566,
  longitude: 2.3522,
};

export default function LocationMapPicker({ selection, onSelectionChange }) {
  const center = selection || DEFAULT_LOCATION;

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          ...center,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        onPress={({ nativeEvent }) => onSelectionChange(nativeEvent.coordinate)}
      >
        {selection ? <Marker coordinate={selection} /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
    overflow: 'hidden',
    borderRadius: 12,
  },
});
