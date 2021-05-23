import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { UserService } from 'src/app/services/user.service';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature, { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle, Fill, Icon, Stroke, Style } from 'ol/style';
import { ProblemNotificationService } from 'src/app/services/problem-notification.service';
import Select, { SelectEvent } from 'ol/interaction/Select';
import Overlay from 'ol/Overlay';
import { User, Vehicle } from 'src/app/models/user';
import { MatSelectionList, MatSelectionListChange } from '@angular/material/list';
import { VehicleLocation } from 'src/app/models/vehicle-geo';

@Component({
  selector: 'app-vehicle-locations',
  templateUrl: './vehicle-locations.component.html',
  styleUrls: ['./vehicle-locations.component.scss']
})
export class VehicleLocationsComponent implements OnInit, OnDestroy {

  loading = true

  vehicle?: Vehicle

  user?: User

  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLElement>

  @ViewChild('popup', { static: true })
  private readonly popup!: ElementRef<HTMLElement>

  @ViewChild('vehicleList', { static: true })
  private readonly vehicleList!: MatSelectionList

  private map!: Map;

  private dataSubscription?: Subscription;
  private routeSubscription?: Subscription;

  private markerVectorSource!: VectorSource
  private featureSelect!: Select
  private popupOverlay!: Overlay

  constructor(private userSvc: UserService, private route: ActivatedRoute, private pNotSvc: ProblemNotificationService) { }

  ngOnInit(): void {
    this.markerVectorSource = new VectorSource()

    const markerLayer = new VectorLayer({
      source: this.markerVectorSource,
    })

    this.popupOverlay = new Overlay({
      element: this.popup.nativeElement,
      autoPan: true,
      autoPanAnimation: {
        duration: 250,
      },
    });

    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        markerLayer
      ],
      view: new View({
        center: fromLonLat([2.896372, 44.6024]),
        zoom: 3,
      }),
      overlays: [this.popupOverlay]
    })

    this.featureSelect = new Select({
      layers: [markerLayer]
    })

    this.featureSelect.on('select', event => {
      if (this.vehicle) {
        this.popupOverlay.setPosition(undefined)
        this.vehicle = undefined
        this.vehicleList.options.forEach(o => {
          o.selected = false
        })
      }
      this.selectVeicleMarker(event.selected[0])
    })

    this.map.addInteraction(this.featureSelect)

    this.routeSubscription = this.route.params.subscribe(params => {
      this.load(params.userId)
    })
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe()
    this.routeSubscription?.unsubscribe()
  }

  private load(userId: number): void {
    this.loading = true
    this.dataSubscription?.unsubscribe()
    this.dataSubscription = forkJoin({
      user: this.userSvc.getUser(userId),
      locations: this.userSvc.listVehicleLocations(userId)
    }).subscribe(data => {
      this.user = data.user
      this.markerVectorSource.clear()
      data.locations.forEach(location => {
        const vehicle = data.user?.vehicles.find(v => v.vehicleid === location.vehicleid)
        const feature = new Feature({
          vehicle: vehicle,
          geometry: new Point(fromLonLat([location.lon, location.lat]))
        })
        feature.setId(vehicle?.vehicleid)
        feature.setStyle(new Style({
          image: new Circle({
            radius: 10,
            fill: new Fill({
              color: vehicle?.color
            })
          })
        }))
        this.markerVectorSource.addFeature(feature)
      })
      const view = this.map.getView()
      view.setCenter(fromLonLat([data.locations[0].lon, data.locations[0].lat]))
      view.setZoom(8)
      this.loading = false
    }, error => {
      this.loading = false
      console.error(error)
      this.pNotSvc.show('Can\'t load data right now!', {
        actionName: 'Retry',
        onAction: () => {
          this.load(userId)
        }
      })
    })
  }

  private selectVeicleMarker(marker: Feature | undefined): void {
    const vehicle: Vehicle | undefined = marker?.get('vehicle')
    if (marker && vehicle) {
      this.vehicle = vehicle
      const coordinates = (<Point>marker.getGeometry())?.getCoordinates()
      this.popupOverlay.setPosition(coordinates)
    }
  }

  onVehicleSelectedFromList(event: MatSelectionListChange): void {
    const vehicle: Vehicle | undefined = event.options[0]?.value

    if (vehicle) {
      const marker = <Feature>this.markerVectorSource.getFeatureById(vehicle.vehicleid)
      this.featureSelect.getFeatures().clear()
      this.featureSelect.getFeatures().push(marker)
      this.selectVeicleMarker(marker)
    }
  }

}
