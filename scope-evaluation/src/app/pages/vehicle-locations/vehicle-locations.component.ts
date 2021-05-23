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
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { ProblemNotificationService } from 'src/app/services/problem-notification.service';
import Select from 'ol/interaction/Select';
import Overlay from 'ol/Overlay';
import { User, Vehicle } from 'src/app/models/user';
import { MatSelectionList, MatSelectionListChange } from '@angular/material/list';
import { VehicleLocation } from 'src/app/models/vehicle-geo';
import { GeocodingService } from 'src/app/services/geocoding.service';

@Component({
  selector: 'app-vehicle-locations',
  templateUrl: './vehicle-locations.component.html',
  styleUrls: ['./vehicle-locations.component.scss']
})
export class VehicleLocationsComponent implements OnInit, OnDestroy {

  loading = true

  vehicle?: Vehicle

  user?: User

  address?: string

  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLElement>

  @ViewChild('popup', { static: true })
  private readonly popup!: ElementRef<HTMLElement>

  @ViewChild('vehicleList', { static: true })
  private readonly vehicleList!: MatSelectionList

  private map!: Map;

  private dataSubscription?: Subscription
  private routeSubscription?: Subscription
  private addressLookupSubscription?: Subscription

  private markerVectorSource!: VectorSource
  private featureSelect!: Select
  private popupOverlay!: Overlay
  private markerLayer!: VectorLayer
  private locationUpdateTimeout?: number

  private locations?: VehicleLocation[]

  constructor(
    private userSvc: UserService,
    private route: ActivatedRoute,
    private pNotSvc: ProblemNotificationService,
    private geocoding: GeocodingService
  ) { }

  ngOnInit(): void {
    this.markerVectorSource = new VectorSource()

    this.markerLayer = new VectorLayer({
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
        this.markerLayer
      ],
      view: new View({
        center: fromLonLat([2.896372, 44.6024]),
        zoom: 3,
      }),
      overlays: [this.popupOverlay]
    })

    this.featureSelect = new Select({
      layers: [this.markerLayer]
    })

    this.featureSelect.on('select', event => {
      if (this.vehicle) {
        this.popupOverlay.setPosition(undefined)
        this.vehicle = undefined
        this.vehicleList.selectedOptions.clear()
      }
      this.selectVehicleMarker(event.selected[0])
      this.markVehicleSelectOptionSelected(this.vehicle)
    })

    this.map.addInteraction(this.featureSelect)

    this.routeSubscription = this.route.params.subscribe(params => {
      this.load(params.userId)
    })
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe()
    this.clearLocationUpdateTimeout()
    this.routeSubscription?.unsubscribe()
    this.addressLookupSubscription?.unsubscribe()
  }

  private load(userId: number): void {
    this.loading = true

    this.dataSubscription?.unsubscribe()
    this.clearLocationUpdateTimeout()

    this.dataSubscription = forkJoin({
      user: this.userSvc.getUser(userId),
      locations: this.userSvc.listVehicleLocations(userId)
    }).subscribe(data => {
      this.user = data.user
      this.locations = data.locations
      this.displayVehicleLocations(data.locations)
      this.scheduleLocationUpdate()
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

  private scheduleLocationUpdate(): void {
    this.locationUpdateTimeout = <any>setTimeout(() => {
      if (this.user) {
        this.userSvc.listVehicleLocations(this.user.userid).subscribe(locations => {
          locations.forEach(location => {
            if (location.lat !== null && location.lon !== null) {
              const marker = <Feature>this.markerVectorSource.getFeatureById(location.vehicleid);
              (<Point>marker.getGeometry()).setCoordinates(fromLonLat([location.lon, location.lat]))
            }
          })
          this.fitZoom()
          this.scheduleLocationUpdate()
        }, error => {
          console.error(error)
          this.scheduleLocationUpdate()
        })
      }
    }, 60 * 1000)
  }

  private displayVehicleLocations(locations: VehicleLocation[]): void {
    this.markerVectorSource.clear()
    
    locations.forEach(location => {
      if (location.lon === null || location.lat === null) {
        return
      }

      const vehicle = this.user?.vehicles.find(v => v.vehicleid === location.vehicleid)

      if (!vehicle) {
        return
      }

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
          }),
          stroke: new Stroke({
            color: 'rgba(0,0,0,0.5)',
            width: 4
          })
        })
      }))

      this.markerVectorSource.addFeature(feature)
    })

    this.fitZoom()
  }

  private fitZoom(): void {
    const extent = this.markerVectorSource.getExtent()
    if (extent) {
      const view = this.map.getView()
      view.fit(extent)
      const zoom = this.map.getView().getZoom()
      if (zoom) {
        view.setZoom(Math.min(zoom - 0.5, 16))
      }
    }
  }

  private selectVehicleMarker(marker: Feature | undefined): void {
    const vehicle: Vehicle | undefined = marker?.get('vehicle')
    if (marker && vehicle) {
      this.addressLookupSubscription?.unsubscribe()
      this.vehicle = vehicle
      this.address = undefined
      const coordinates = (<Point>marker.getGeometry())?.getCoordinates()
      this.popupOverlay.setPosition(coordinates)
      const location = this.locations?.find(l => l.vehicleid == vehicle.vehicleid)
      if (location && location.lat && location.lon) {
        this.addressLookupSubscription = this.geocoding.reverse(location.lat, location.lon).subscribe(place => {
          this.address = place.display_name
        })
      }
    }
  }

  private markVehicleSelectOptionSelected(veicle: Vehicle | undefined): void {
    if (veicle) {
      const option = this.vehicleList.options.find(o => o.value === this.vehicle)
      if (option) {
        this.vehicleList.selectedOptions.select(option)
      }
    }
  }

  private clearLocationUpdateTimeout(): void {
    if (this.locationUpdateTimeout !== undefined) {
      clearTimeout(this.locationUpdateTimeout)
      this.locationUpdateTimeout = undefined
    }
  }

  onVehicleSelectedFromList(event: MatSelectionListChange): void {
    const vehicle: Vehicle | undefined = event.options[0]?.value

    if (vehicle) {
      this.featureSelect.getFeatures().clear()
      const marker = <Feature>this.markerVectorSource.getFeatureById(vehicle.vehicleid)
      this.featureSelect.getFeatures().push(marker)
      this.selectVehicleMarker(marker)
    }
  }

}
