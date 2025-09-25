// This is sample GeoJSON data representing village boundaries for the heatmap.
// In a real application, this data would come from a GIS database or a more precise source.
// These polygons are simple rectangles created for demonstration purposes.

export const villageBoundaries = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Arasampalayam" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [77.00, 10.72],
            [77.03, 10.72],
            [77.03, 10.74],
            [77.00, 10.74],
            [77.00, 10.72]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Veerapandi" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [77.02, 11.07],
            [77.05, 11.07],
            [77.05, 11.09],
            [77.02, 11.09],
            [77.02, 11.07]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Jadayampalayam" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.93, 11.28],
            [76.96, 11.28],
            [76.96, 11.31],
            [76.93, 11.31],
            [76.93, 11.28]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Kangayampalayam" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [77.12, 11.01],
            [77.15, 11.01],
            [77.15, 11.03],
            [77.12, 11.03],
            [77.12, 11.01]
          ]
        ]
      }
    }
  ]
};
