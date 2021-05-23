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
import Select from 'ol/interaction/Select';
import Overlay from 'ol/Overlay';
import { Vehicle } from 'src/app/models/user';

@Component({
  selector: 'app-vehicle-locations',
  templateUrl: './vehicle-locations.component.html',
  styleUrls: ['./vehicle-locations.component.scss']
})
export class VehicleLocationsComponent implements OnInit, OnDestroy {

  loading = true

  vehicle?: Vehicle

  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLElement>

  @ViewChild('popup', { static: true })
  private readonly popup!: ElementRef<HTMLElement>

  private map!: Map;

  private dataSubscription?: Subscription;
  private routeSubscription?: Subscription;

  private markerVectorSource!: VectorSource

  constructor(private userSvc: UserService, private route: ActivatedRoute, private pNotSvc: ProblemNotificationService) { }

  ngOnInit(): void {
    this.markerVectorSource = new VectorSource()

    const markerLayer = new VectorLayer({
      source: this.markerVectorSource,
    })

    const overlay = new Overlay({
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
      overlays: [overlay]
    })

    const select = new Select({
      layers: [markerLayer]
    })

    select.on('select', event => {
      const feature: Feature | undefined = event.selected[0]
      const vehicle: Vehicle | undefined = feature?.get('vehicle')
      if (feature && vehicle) {
        this.vehicle = vehicle
        const coordinates = (<Point>feature.getGeometry())?.getCoordinates()
        overlay.setPosition(coordinates)
      } else if (this.vehicle) {
        overlay.setPosition(undefined)
        this.vehicle = undefined
      }
    })

    this.map.addInteraction(select)

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
        this.markerVectorSource.clear()
        data.locations.forEach(location => {
          const vehicle = data.user?.vehicles.find(v => v.vehicleid === location.vehicleid)
          const feature = new Feature({
            vehicle: vehicle,
            geometry: new Point(fromLonLat([location.lon, location.lat]))
          })
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

}
