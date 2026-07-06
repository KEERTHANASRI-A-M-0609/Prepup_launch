def placement_stage(score):

    if score < 40:
        return "Foundation"

    elif score < 70:
        return "Developing"

    else:
        return "Placement Ready"