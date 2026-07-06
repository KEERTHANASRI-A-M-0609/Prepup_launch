def get_resource(skill):

    resources = {

        "DSA": {
            "name": "Striver A2Z DSA Sheet",
            "reason": "Structured roadmap for placements"
        },

        "Communication": {
            "name": "HR Interview Preparation",
            "reason": "Improves interview confidence"
        },

        "Resume": {
            "name": "Resume ATS Guide",
            "reason": "Improves resume quality"
        },

        "Aptitude": {
            "name": "IndiaBix Aptitude",
            "reason": "Strong aptitude practice platform"
        }
    }

    return resources.get(skill)