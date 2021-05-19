export interface Owner {
    name: string
    surname: string
    foto: string
}

export interface Vehicle {
    vehicleid: number
    make: string
    model: string
    year: string
    color: string
    vin:  string
    foto: string
}

export interface User {
    userid: number
    owner: Owner
    vehicles: Vehicle[]
}