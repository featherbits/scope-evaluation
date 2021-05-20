import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import Tile from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';

@Component({
  selector: 'app-vehicle-locations',
  templateUrl: './vehicle-locations.component.html',
  styleUrls: ['./vehicle-locations.component.scss']
})
export class VehicleLocationsComponent implements OnInit {

  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLElement>

  constructor() { }

  ngOnInit(): void {
    new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new Tile({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([37.41, 8.82]),
        zoom: 4
      })
    });
  }

}
