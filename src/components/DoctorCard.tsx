import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Star } from "lucide-react";

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  location: string;
  rating: number;
  available: boolean;
  image?: string;
}

const DoctorCard = ({
  id,
  name,
  specialty,
  experience,
  location,
  rating,
  available,
  image,
}: DoctorCardProps) => {
  return (
    <Card className="overflow-hidden shadow-card hover:shadow-hover transition-base">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
            <span className="text-6xl font-bold text-primary/20">{name.charAt(0)}</span>
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-xl font-semibold mb-1">{name}</h3>
            <p className="text-sm text-muted-foreground">{specialty}</p>
          </div>
          {available && (
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
              Available
            </Badge>
          )}
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-foreground">{rating}</span>
            <span>({Math.floor(Math.random() * 100) + 50} reviews)</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            {location}
          </div>
          <p className="text-sm text-muted-foreground">
            {experience} years experience
          </p>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Link to={`/appointments/book/${id}`} className="w-full">
          <Button className="w-full" disabled={!available}>
            <Calendar className="mr-2 h-4 w-4" />
            Book Appointment
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default DoctorCard;
