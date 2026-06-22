/**
 * Public-facing contractor sanitizer.
 *
 * The contractors collection holds private fields (email, phone, Stripe ids).
 * Anonymous visitors — including search engines — read contractor data through
 * the /api/public/contractors endpoints, which expose ONLY the fields below.
 */
export function sanitizeContractor(id: string, data: Record<string, any>) {
  return {
    id,
    name:                data.name ?? null,
    trade:               data.trade ?? null,
    trades:              data.trades ?? [],
    city:                data.city ?? null,
    state:               data.state ?? null,
    bio:                 data.bio ?? null,
    experience:          data.experience ?? null,
    hourly:              data.hourly ?? null,
    photoUrl:            data.photoUrl ?? null,
    portfolio:           data.portfolio ?? [],
    images:              data.images ?? [],
    certifications:      data.certifications ?? [],
    rating:              data.rating ?? data.avgRating ?? null,
    avgRating:           data.avgRating ?? data.rating ?? null,
    reviewCount:         data.reviewCount ?? 0,
    jobsCompleted:       data.jobsCompleted ?? 0,
    trustScore:          data.trustScore ?? 0,
    availability:        data.availability ?? null,
    subscriptionPlan:    data.subscriptionPlan ?? null,
    qualityScore:        data.qualityScore ?? null,
    verifiedSpecialties: data.verifiedSpecialties ?? 0,
    responseScore:       data.responseScore ?? null,
    serviceRadiusMiles:  data.serviceRadiusMiles ?? null,
    zipCode:             data.zipCode ?? null,
    verificationStatus:  data.verificationStatus ?? null,
    licenseVerified:     data.licenseVerified ?? false,
    insuranceVerified:   data.insuranceVerified ?? false,
    stripeConnectVerified: data.stripeConnectVerified ?? false,
    socialHandles:       data.socialHandles ?? {},
    // socialConnections (OAuth tokens) intentionally excluded
  };
}
