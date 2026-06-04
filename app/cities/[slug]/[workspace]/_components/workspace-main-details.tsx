"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceDetail } from "@/lib/types";
import { Accessibility, Bike, Car, Coffee, PawPrint, Sprout, Sun, Users, Utensils, Volume2, Wifi, Wind, Zap } from "lucide-react";

type WorkspaceMainDetailsProps = {
  workspace: WorkspaceDetail;
};

export function WorkspaceMainDetails({ workspace }: WorkspaceMainDetailsProps) {
  return (
    <>
      {workspace.description && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">{workspace.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Productivity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Wifi className={`h-5 w-5 ${workspace.has_wifi ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium">WiFi</p>
              {workspace.wifi_speed && <p className="text-sm text-muted-foreground capitalize">{workspace.wifi_speed}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap className={`h-5 w-5 ${workspace.has_power_outlets ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium">Power Outlets</p>
              {workspace.power_outlet_availability && (
                <p className="text-sm text-muted-foreground">{workspace.power_outlet_availability}/5 availability</p>
              )}
            </div>
          </div>
          {workspace.seating_capacity && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Seating</p>
                <p className="text-sm text-muted-foreground">{workspace.seating_capacity} seats</p>
              </div>
            </div>
          )}
          {workspace.noise_level && (
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Noise Level</p>
                <p className="text-sm text-muted-foreground capitalize">{workspace.noise_level}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {workspace.has_coffee && <AmenityItem icon={<Coffee className="h-4 w-4 text-primary" />} label="Coffee" />}
            {workspace.has_food && <AmenityItem icon={<Utensils className="h-4 w-4 text-primary" />} label="Food" />}
            {workspace.has_veg && <AmenityItem icon={<Sprout className="h-4 w-4 text-primary" />} label="Vegetarian/Vegan options" />}
            {workspace.has_natural_light && <AmenityItem icon={<Sun className="h-4 w-4 text-primary" />} label="Natural Light" />}
            {workspace.has_air_conditioning && <AmenityItem icon={<Wind className="h-4 w-4 text-primary" />} label="A/C" />}
            {workspace.has_parking && <AmenityItem icon={<Car className="h-4 w-4 text-primary" />} label="Parking" />}
            {workspace.has_bike_parking && <AmenityItem icon={<Bike className="h-4 w-4 text-primary" />} label="Bike Parking" />}
            {workspace.is_accessible && <AmenityItem icon={<Accessibility className="h-4 w-4 text-primary" />} label="Accessible" />}
            {workspace.allows_pets && <AmenityItem icon={<PawPrint className="h-4 w-4 text-primary" />} label="Pet Friendly" />}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AmenityItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}
